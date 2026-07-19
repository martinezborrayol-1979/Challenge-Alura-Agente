import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "20mb" }));

  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // In-memory Prompt Cache (LLMCache) to accelerate cycles and reduce costs
  const promptCache = new Map<string, {
    response: any;
    timestamp: number;
  }>();

  // Helper function to retry Gemini API calls on transient / temporary 503, 429, or UNAVAILABLE errors
  async function callGeminiWithRetry(
    fn: () => Promise<any>, 
    retries = 4, 
    delayMs = 2000, 
    modelToRetry?: string, 
    systemInstructionForFallback?: string, 
    promptForFallback?: string, 
    responseSchemaForFallback?: any
  ): Promise<any> {
    try {
      return await fn();
    } catch (error: any) {
      const errorStr = String(error.message || JSON.stringify(error) || error).toLowerCase();
      const isTemporary = errorStr.includes("503") || 
                          errorStr.includes("resource_exhausted") || 
                          errorStr.includes("unavailable") || 
                          errorStr.includes("overloaded") || 
                          errorStr.includes("high demand") ||
                          errorStr.includes("rate limit") ||
                          errorStr.includes("429") ||
                          errorStr.includes("quota") ||
                          errorStr.includes("resource exhausted");
                          
      if (isTemporary && retries > 0) {
        let waitMs = delayMs;
        // Parse "retry in XXs" or "retry in XX.XX seconds" or "retryDelay" from the error
        const delayMatch = errorStr.match(/retry(?:ing| in)?\s*(?:after|in)?\s*([\d\.]+)\s*(?:s|second)/) || 
                           errorStr.match(/retrydelay"\s*:\s*"([\d\.]+)s"/) ||
                           errorStr.match(/retry\s+in\s+([\d\.]+)\s+seconds/);
                           
        if (delayMatch && delayMatch[1]) {
          const seconds = parseFloat(delayMatch[1]);
          if (!isNaN(seconds) && seconds > 0) {
            waitMs = (seconds * 1000) + 1500; // Add generous 1.5 second buffer
          }
        }
        
        console.warn(`[Gemini Retry] Error temporal detectado (Código/Mensaje: ${error.message || error}). Esperando ${waitMs}ms antes del reintento... (${retries} intentos restantes)`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
        return callGeminiWithRetry(
          fn, 
          retries - 1, 
          Math.min(waitMs * 1.5, 45000), 
          modelToRetry, 
          systemInstructionForFallback, 
          promptForFallback, 
          responseSchemaForFallback
        );
      }
      
      // Attempt Gemini Model Fallback if modelToRetry is specified
      if (modelToRetry) {
        const fallbackModel = modelToRetry === "gemini-3.5-flash" ? "gemini-3.1-flash-lite" : "gemini-3.5-flash";
        console.warn(`[Gemini Fallback] El modelo principal ${modelToRetry} ha agotado sus reintentos. Intentando degradación de servicio a ${fallbackModel}...`);
        
        try {
          return await ai.models.generateContent({
            model: fallbackModel,
            contents: promptForFallback || "",
            config: systemInstructionForFallback ? {
              systemInstruction: systemInstructionForFallback,
              responseMimeType: responseSchemaForFallback ? "application/json" : undefined,
              responseSchema: responseSchemaForFallback || undefined
            } : undefined
          });
        } catch (fallbackError: any) {
          console.error(`[Gemini Fallback] El modelo alternativo ${fallbackModel} también falló:`, fallbackError.message || fallbackError);
        }
      }
      
      // Ultimate Recovery: Attempt fallback to Cohere if the API Key is available
      if (process.env.COHERE_API_KEY && promptForFallback) {
        console.warn("[Gemini Fallback] Todos los modelos de Gemini fallaron. Intentando recuperación de emergencia utilizando Cohere...");
        try {
          const systemInst = systemInstructionForFallback || "Eres un consultor analista de negocios de élite.";
          const cohereText = await callCohereChat([{ role: "user", content: promptForFallback }], systemInst);
          return {
            text: cohereText
          };
        } catch (cohereError: any) {
          console.error("[Gemini Fallback] Cohere también falló en la recuperación de emergencia:", cohereError.message || cohereError);
        }
      }
      
      throw error;
    }
  }

  // Parse errors into polite, action-oriented Spanish messages with detailed guidance
  function parseGeminiError(error: any): string {
    const errorStr = String(error.message || error).toLowerCase();
    
    let waitMessage = "";
    const delayMatch = errorStr.match(/retry(?:ing| in)?\s*(?:after|in)?\s*([\d\.]+)\s*(?:s|second)/) || 
                       errorStr.match(/retrydelay"\s*:\s*"([\d\.]+)s"/) ||
                       errorStr.match(/retry\s+in\s+([\d\.]+)\s+seconds/);
    if (delayMatch && delayMatch[1]) {
      const seconds = Math.ceil(parseFloat(delayMatch[1]));
      if (!isNaN(seconds) && seconds > 0) {
        waitMessage = ` (Por favor espera aproximadamente ${seconds} segundos para el reinicio de cuota).`;
      }
    }

    if (errorStr.includes("503") || errorStr.includes("unavailable") || errorStr.includes("high demand") || errorStr.includes("overloaded")) {
      return "El motor de Inteligencia Artificial (Gemini) está experimentando una alta demanda temporal de forma generalizada. Hemos realizado múltiples reintentos y fallback. Por favor, espera unos segundos y vuelve a intentarlo.";
    }
    if (errorStr.includes("rate_limit") || errorStr.includes("429") || errorStr.includes("resource_exhausted") || errorStr.includes("quota")) {
      return `Se ha alcanzado el límite de peticiones (cuota) del servicio de Inteligencia Artificial.${waitMessage} Por favor, reintenta tu solicitud en un momento.`;
    }
    if (errorStr.includes("api key") || errorStr.includes("apikey")) {
      return "La clave de API (GEMINI_API_KEY) no es válida o no está configurada correctamente en el servidor.";
    }
    return error.message || "Error al comunicarse con el servicio de Inteligencia Artificial.";
  }

  // Helper function to call Cohere Chat V2 API
  async function callCohereChat(messages: { role: string; content: string }[], systemInstruction?: string): Promise<string> {
    const cohereKey = process.env.COHERE_API_KEY;
    if (!cohereKey) {
      throw new Error("La clave de API de Cohere (COHERE_API_KEY) no está configurada en el servidor.");
    }

    const formattedMessages = [...messages];
    if (systemInstruction) {
      formattedMessages.unshift({
        role: "system",
        content: systemInstruction,
      });
    }

    const response = await fetch("https://api.cohere.com/v2/chat", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${cohereKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "command-r-plus-08-2024",
        messages: formattedMessages,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Error de la API de Cohere: Código de estado ${response.status}`);
    }

    const data = await response.json();
    const text = data?.message?.content?.[0]?.text || data?.text || "";
    if (!text) {
      throw new Error("No se pudo obtener una respuesta válida del modelo de Cohere.");
    }

    return text;
  }

  // Configuration endpoint to let frontend know which API keys are present
  app.get("/api/config", (req, res) => {
    res.json({
      hasGemini: !!process.env.GEMINI_API_KEY,
      hasCohere: !!process.env.COHERE_API_KEY,
    });
  });

  // 1. Analyze Document (Structured Metadata, Category & Summary)
  app.post("/api/documents/analyze", async (req, res) => {
    try {
      const { text, filename, provider } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Falta el texto del documento para analizar" });
      }

      if (provider === "cohere") {
        if (!process.env.COHERE_API_KEY) {
          return res.status(400).json({ error: "La clave COHERE_API_KEY no está configurada en el servidor." });
        }

        const prompt = `Analiza este documento titulado/nombrado como "${filename || 'Documento sin título'}":\n\n${text}

Devuelve un JSON estrictamente con la siguiente estructura exacta en español, sin rodeos, sin comentarios de código markdown ni bloques (solo texto plano JSON):
{
  "category": "Categoría calculada del documento: 'Financiero', 'Legal', 'Técnico', 'Recursos Humanos', o 'General'.",
  "summary": "Un resumen ejecutivo de alta calidad, claro y detallado de 2 a 4 oraciones.",
  "language": "Idioma principal detectado en el documento.",
  "metadata": [
    { "key": "Atributo clave del metadato (ej. 'Monto Total', 'Fecha de Vigencia', 'Autor')", "value": "Valor extraído con exactitud del documento." }
  ],
  "suggestedActions": ["Lista de acciones de negocio sugeridas que se desprenden del documento"],
  "riskLevel": "Nivel de riesgo detectado (Bajo, Medio, Alto) junto con una justificación de 1 oración."
}`;

        const responseText = await callCohereChat([{ role: "user", content: prompt }], "Eres un extractor de metadatos JSON documental ultra preciso que responde únicamente con JSON.");
        let cleanJson = responseText.trim();
        if (cleanJson.startsWith("```")) {
          cleanJson = cleanJson.replace(/^```json?\s*/i, "").replace(/\s*```$/, "");
        }
        const data = JSON.parse(cleanJson);
        return res.json(data);
      }

      if (!apiKey) {
        return res.status(500).json({ error: "La clave GEMINI_API_KEY no está configurada en el servidor." });
      }

      const prompt = `Analiza este documento titulado/nombrado como "${filename || 'Documento sin título'}":\n\n${text}`;
      
      const systemInstruction = "Eres DocuMind AI, un motor de inteligencia documental de élite. Tu objetivo es extraer metadatos estructurales de un documento, resumirlo detalladamente y categorizarlo adecuadamente (Financiero, Legal, Técnico, Recursos Humanos o General). Responde en español.";
      
      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          category: { 
            type: Type.STRING, 
            description: "Categoría calculada del documento: 'Financiero', 'Legal', 'Técnico', 'Recursos Humanos', o 'General'." 
          },
          summary: { 
            type: Type.STRING, 
            description: "Un resumen ejecutivo de alta calidad, claro y detallado de 2 a 4 oraciones." 
          },
          language: { 
            type: Type.STRING, 
            description: "Idioma principal detectado en el documento." 
          },
          metadata: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                key: { type: Type.STRING, description: "Atributo clave del metadato (ej. 'Monto Total', 'Fecha de Vigencia', 'Partes Involucradas', 'Autor', 'Cláusula Clave', etc.)" },
                value: { type: Type.STRING, description: "Valor extraído con exactitud del documento." }
              },
              required: ["key", "value"]
                },
            description: "Lista de campos clave y valores extraídos del contenido del documento."
          },
          suggestedActions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Pasos o acciones de negocio sugeridas que se desprenden directamente de este documento."
          },
          riskLevel: { 
            type: Type.STRING, 
            description: "Nivel de riesgo detectado (Bajo, Medio, Alto) junto con una justificación de 1 oración." 
          }
        },
        required: ["category", "summary", "language", "metadata", "suggestedActions", "riskLevel"]
      };

      const response = await callGeminiWithRetry(() => ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          responseSchema: responseSchema
        }
      }), 4, 2000, "gemini-3.5-flash", systemInstruction, prompt, responseSchema);

      const textResponse = response.text;
      if (!textResponse) {
        throw new Error("No se obtuvo respuesta del modelo");
      }

      let cleanJson = textResponse.trim();
      if (cleanJson.startsWith("```")) {
        cleanJson = cleanJson.replace(/^```json?\s*/i, "").replace(/\s*```$/, "");
      }
      const data = JSON.parse(cleanJson);
      res.json(data);
    } catch (error: any) {
      console.error("Error en análisis:", error);
      res.status(500).json({ error: parseGeminiError(error) });
    }
  });

  // Global feedback logs store in memory
  const feedbackLogs: {
    messageId: string;
    docId: string;
    liked: boolean;
    comment?: string;
    timestamp: string;
  }[] = [];

  // Feedback logging endpoints
  app.post("/api/feedback", (req, res) => {
    try {
      const { messageId, docId, liked, comment } = req.body;
      if (!messageId || !docId || liked === undefined) {
        return res.status(400).json({ error: "Faltan campos requeridos para registrar feedback" });
      }

      const log = {
        messageId,
        docId,
        liked: !!liked,
        comment: comment || "",
        timestamp: new Date().toLocaleString("es-ES", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        })
      };

      feedbackLogs.push(log);
      res.json({ success: true, log });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Error al guardar feedback" });
    }
  });

  app.get("/api/feedback", (req, res) => {
    res.json(feedbackLogs);
  });

  // Helper function for Semantic Paragraph-Coherence Chunking with dynamic size
  function getSemanticChunks(text: string, targetSize = 1000): string[] {
    const paragraphs = text.split(/\n\s*\n+/);
    const chunks: string[] = [];
    let currentChunk = "";
    
    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (!trimmed) continue;
      
      // Merge paragraphs until we reach targetSize characters to keep context rich
      if (currentChunk.length + trimmed.length < targetSize) {
        currentChunk += (currentChunk ? "\n\n" : "") + trimmed;
      } else {
        if (currentChunk) chunks.push(currentChunk);
        currentChunk = trimmed;
      }
    }
    if (currentChunk) chunks.push(currentChunk);
    
    if (chunks.length === 0 && text.trim()) {
      chunks.push(text.trim());
    }
    return chunks;
  }

  // Helper function for TF-IDF Keyword-Density Retrieval and Re-ranking
  function retrieveAndReRankChunks(query: string, chunks: string[], topN = 3): string[] {
    const queryWords = query.toLowerCase()
      .replace(/[^a-z0-9áéíóúüñ]/gi, " ")
      .split(/\s+/)
      .filter(w => w.length > 2);
    
    if (queryWords.length === 0) {
      return chunks.slice(0, topN);
    }
    
    const scoredChunks = chunks.map((chunk, index) => {
      const chunkLower = chunk.toLowerCase();
      let score = 0;
      
      for (const word of queryWords) {
        const regex = new RegExp(word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), "g");
        const count = (chunkLower.match(regex) || []).length;
        if (count > 0) {
          // Boost matching counts
          score += count * 2.0;
          // Document frequency density boost (favor shorter precise matching chunks)
          score += (word.length / chunk.length) * 15;
        }
      }
      
      // Strict exact phrase boost
      const cleanedQuery = query.toLowerCase().trim();
      if (chunkLower.includes(cleanedQuery)) {
        score += 60;
      }
      
      return { chunk, score, index };
    });
    
    scoredChunks.sort((a, b) => b.score - a.score);
    return scoredChunks.slice(0, topN).map(item => item.chunk);
  }

  // Helper function for Input Guardrails
  function runInputGuardrails(query: string): { triggered: boolean; reason?: string } {
    const queryLower = query.toLowerCase();
    
    // Prompt injection and jailbreak patterns
    const jailbreakPatterns = [
      "ignore previous instructions", "ignora las instrucciones", "forget everything", "olvida todo",
      "forget your system prompt", "tu eres un hacker", "you are now a", "actúas como", "actúa como un hacker",
      "system overrides", "desactivar filtros", "disable filters", "bypass safety", "danos el prompt de sistema",
      "reveal your prompt", "muéstrame tu instrucción de sistema"
    ];
    
    for (const pattern of jailbreakPatterns) {
      if (queryLower.includes(pattern)) {
        return {
          triggered: true,
          reason: "Intento de Inyección de Prompt / Evasión de Filtros (Jailbreak)"
        };
      }
    }
    
    // PII (Personal Identifiable Information) checks
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const ccRegex = /\b(?:\d[ -]*?){13,19}\b/g;
    const passwordKeywords = ["password=", "contraseña=", "key=", "passwd="];
    
    if (emailRegex.test(query)) {
      return {
        triggered: true,
        reason: "Contiene Información de Identificación Personal (PII): Dirección de Correo Electrónico"
      };
    }
    
    if (ccRegex.test(query)) {
      const cleaned = query.replace(/[\s-]/g, "");
      if (/^\d{13,19}$/.test(cleaned)) {
        return {
          triggered: true,
          reason: "Contiene Información de Identificación Personal (PII): Número de Tarjeta de Crédito potencial"
        };
      }
    }
    
    for (const kw of passwordKeywords) {
      if (queryLower.includes(kw)) {
        return {
          triggered: true,
          reason: "Contiene Información de Identificación Personal (PII): Credenciales o Claves de Acceso"
        };
      }
    }
    
    return { triggered: false };
  }

  // Helper function for Output Guardrails
  function runOutputGuardrails(text: string): { triggered: boolean; reason?: string; sanitizedText: string } {
    const textLower = text.toLowerCase();
    
    // Competitors of DocuMind (to ensure brand-alignment)
    const competitorNames = ["chatgpt", "openai", "claude", "anthropic", "adobe acrobat pro ai", "adobe ai", "microsoft copilot", "cohere command", "bard"];
    let triggered = false;
    let reason = "";
    let sanitizedText = text;
    
    for (const competitor of competitorNames) {
      if (textLower.includes(competitor)) {
        triggered = true;
        reason = `Mención de marca competidora detectada (${competitor}). Se aplica filtro de alineación de marca.`;
        const regex = new RegExp(competitor, "gi");
        sanitizedText = sanitizedText.replace(regex, "DocuMind AI");
      }
    }
    
    // Unaligned/toxic content checks
    const toxicKeywords = ["puto", "mierda", "pendejo", "cabron", "hacker malicioso", "estafa", "fraude"];
    for (const kw of toxicKeywords) {
      if (textLower.includes(kw)) {
        triggered = true;
        reason = "Contenido tóxico o no alineado con los valores éticos de la marca.";
        sanitizedText = sanitizedText.replace(new RegExp(kw, "gi"), "[Filtrado por Seguridad]");
      }
    }
    
    return { triggered, reason: triggered ? reason : undefined, sanitizedText };
  }

  // Heuristic-based Segment Overlap & Keyword Density calculation for continuous RAG observability
  function computeChunkAttributions(finalAnswer: string, retrievedChunks: string[]) {
    const stopwords = new Set(["y", "e", "o", "u", "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "al", "en", "con", "para", "por", "que", "es", "son", "se", "lo", "su", "sus", "este", "esta", "como", "más", "pero", "para", "si", "no"]);
    const answerWords = finalAnswer.toLowerCase()
      .replace(/[^a-z0-9áéíóúüñ]/gi, " ")
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopwords.has(w));
    
    if (answerWords.length === 0 || retrievedChunks.length === 0) {
      return retrievedChunks.map(c => ({ chunk: c, score: 0, attributed: false }));
    }

    return retrievedChunks.map((chunk) => {
      const chunkWords = chunk.toLowerCase()
        .replace(/[^a-z0-9áéíóúüñ]/gi, " ")
        .split(/\s+/)
        .filter(w => w.length > 2 && !stopwords.has(w));
      
      if (chunkWords.length === 0) {
        return { chunk, score: 0, attributed: false };
      }

      // Check how many of the answer words are also present in this chunk
      const matched = answerWords.filter(w => chunkWords.includes(w));
      const uniqueMatched = Array.from(new Set(matched));
      
      // Calculate attribution ratio based on a scale of reference density
      const score = Math.min(Math.round((uniqueMatched.length / Math.min(answerWords.length, 12)) * 100), 100);
      const attributed = score >= 15; // Threshold where a chunk clearly influenced the terms of the response

      return {
        chunk,
        score,
        attributed
      };
    });
  }

  // 2. Chat with Document (Q&A Contextual con Guardrails, Observabilidad, Prompting Avanzado y Out-of-Domain)
  app.post("/api/documents/chat", async (req, res) => {
    const startTime = Date.now();
    try {
      const { 
        text, 
        query, 
        history, 
        lowLatency, 
        provider, 
        promptTechnique, 
        category, 
        role,
        chunkSize = 1000,
        retrievalK = 3,
        temperature = 0.1,
        useCache = true,
        useSearchGrounding = false
      } = req.body;
      
      if (!text || !query) {
        return res.status(400).json({ error: "Faltan datos requeridos (texto del documento o consulta)" });
      }

      // Check Prompt Cache (LLMCache) first to accelerate response and save costs
      const cacheKey = `${text.length}_${chunkSize}_${retrievalK}_${temperature}_${promptTechnique || "standard"}_${provider || "gemini"}_${category || "General"}_${query.trim().toLowerCase()}_${!!useSearchGrounding}`;
      if (useCache && promptCache.has(cacheKey)) {
        const cached = promptCache.get(cacheKey)!;
        const totalLatency = Date.now() - startTime;
        
        // Return cached payload with 0 cost and extremely low latency
        return res.json({
          ...cached.response,
          thinkingProcess: `⚡ [LLMCache HIT - Respuesta recuperada instantáneamente de la caché del servidor]\n\n${cached.response.thinkingProcess}`,
          metrics: {
            ...cached.response.metrics,
            latencyMs: totalLatency,
            costUsd: 0, // Cache saves money!
            stepLatencies: {
              retrievalMs: 0,
              guardrailMs: 0,
              generationMs: totalLatency
            },
            isCached: true
          }
        });
      }

      // 1. Run Input Guardrails
      const guardrailStart = Date.now();
      const inputGuardrail = runInputGuardrails(query);
      const guardrailTime = Date.now() - guardrailStart;
      
      if (inputGuardrail.triggered) {
        const totalLatency = Date.now() - startTime;
        return res.json({
          text: `[BLOQUEADO] Lo siento, tu mensaje no pudo ser procesado debido a que infringe nuestras normas de seguridad: ${inputGuardrail.reason}.`,
          thinkingProcess: "La consulta fue abortada en el paso de Guardrails de entrada debido a riesgos de seguridad o privacidad.",
          metrics: {
            latencyMs: totalLatency,
            costUsd: 0,
            groundedness: 0,
            uncertainty: "Bajo",
            faithfulness: 0,
            outOfDomain: false,
            stepLatencies: {
              retrievalMs: 0,
              guardrailMs: guardrailTime,
              generationMs: 0
            },
            retrievedChunks: []
          },
          guardrails: {
            inputTriggered: true,
            inputReason: inputGuardrail.reason,
            outputTriggered: false
          }
        });
      }

      // 2. Retrieval: Semantic Chunking with custom size & TF-IDF Re-ranking with custom K limit
      const retrievalStart = Date.now();
      const allChunks = getSemanticChunks(text, chunkSize);
      const retrievedChunks = retrieveAndReRankChunks(query, allChunks, retrievalK);
      const retrievalTime = Date.now() - retrievalStart;

      // 3. System Expert Persona & Prompting Technique Formulation
      const selectedCategory = category || "General";
      let expertPersona = "";
      switch (selectedCategory) {
        case "Financiero":
          expertPersona = "Eres un Auditor Financiero Senior con certificación CFA y experto en análisis de riesgo fiscal y corporativo.";
          break;
        case "Legal":
          expertPersona = "Eres un Asesor Legal Corporativo experto en derecho contractual internacional, cumplimiento normativo y resolución de disputas.";
          break;
        case "Técnico":
          expertPersona = "Eres un Arquitecto de Software Principal experto en APIs, rendimiento, algoritmos, y seguridad de la información.";
          break;
        case "Recursos Humanos":
          expertPersona = "Eres un Director de Recursos Humanos de élite experto en cultura laboral, planes de desarrollo de talento y legislación de trabajo.";
          break;
        default:
          expertPersona = "Eres un Consultor de Estrategia Documental de élite, experto en extraer valor analítico de documentos de negocio.";
      }

      const activeTechnique = promptTechnique || "standard";
      let techniqueInstructions = "";
      if (activeTechnique === "cot") {
        techniqueInstructions = "Antes de escribir la respuesta final, realiza un análisis reflexivo y paso a paso de tu razonamiento en el campo 'thinkingProcess'. Explica las deducciones lógicas y de qué sección exacta proviene la información. Luego, proporciona la respuesta final en 'finalAnswer'.";
      } else if (activeTechnique === "cove") {
        techniqueInstructions = "Aplica rigurosamente el método Chain-of-Verification (CoVe) en el campo 'thinkingProcess': 1. Borrador: Escribe un borrador rápido de la respuesta. 2. Preguntas: Genera 2 o 3 preguntas concretas de verificación de hechos basados en el borrador (fechas, cifras, obligaciones). 3. Respuestas: Responde cada pregunta basándote estrictamente en los fragmentos del documento. 4. Corrección: Corrige cualquier discrepancia del borrador. Finalmente, escribe la respuesta final depurada en 'finalAnswer'.";
      } else {
        techniqueInstructions = "Genera una respuesta profesional, directa y clara en 'finalAnswer'. Detalla brevemente tus consideraciones en el campo 'thinkingProcess'. Evita especulaciones.";
      }

      const contextText = retrievedChunks.map((c, i) => `[Fragmento #${i+1}]\n${c}`).join("\n\n");
      const chatHistory = history || [];
      const formattedHistory = chatHistory.map((h: any) => `${h.role === 'user' ? 'Usuario' : 'Asistente'}: ${h.content}`).join("\n");

      const prompt = `Formulación del contexto del documento para responder a la pregunta:
--- CONTEXTO RECUPERADO DEL DOCUMENTO ---
${contextText}
-----------------------------------------

HISTORIAL DE CONVERSACIÓN PREVIA:
${formattedHistory}

PREGUNTA ACTUAL DEL USUARIO: ${query}

Instrucciones de negocio:
- Basa tu respuesta final ÚNICAMENTE en el CONTEXTO RECUPERADO DEL DOCUMENTO provisto.
- Si la pregunta no se puede responder directamente o es un saludo trivial o conversación social normal, clasifica outOfDomain como false y responde de manera amigable.
- Si es una pregunta técnica o de negocio detallada que no tiene relación con el documento o el contexto, clasifica outOfDomain como true.
- Genera un JSON que cumpla estrictamente con el siguiente esquema requerido.

REQUISITO DE SALIDA: Debes responder única y exclusivamente con un objeto JSON estructurado que siga este esquema JSON exacto:
{
  "thinkingProcess": "Tu proceso detallado según la técnica elegida (${activeTechnique}).",
  "finalAnswer": "Tu respuesta final completa en español redactada con profesionalidad.",
  "groundednessScore": 95, // Entero de 0 a 100 indicando qué tan fundamentada está la respuesta en el contexto.
  "faithfulnessScore": 95,  // Entero de 0 a 100 indicando la ausencia de contradicciones con la fuente.
  "uncertaintyLevel": "Bajo", // 'Bajo', 'Medio' o 'Alto' indicando el grado de certidumbre/duda.
  "outOfDomain": false // true si la pregunta de negocio es ajena al documento, false en caso contrario.
}`;

      // 4. Model Generation Call
      const generationStart = Date.now();
      if (!apiKey) {
        return res.status(500).json({ error: "La clave GEMINI_API_KEY no está configurada en el servidor." });
      }

      const useSearch = !!useSearchGrounding;
      // Google search grounding requires gemini-3.5-flash
      const selectedModel = useSearch ? "gemini-3.5-flash" : (lowLatency !== false ? "gemini-3.1-flash-lite" : "gemini-3.5-flash");

      let systemInstruction = `${expertPersona} ${techniqueInstructions} Siempre responde en español utilizando el esquema estructurado de salida solicitado.`;
      if (useSearch) {
        systemInstruction += " Además, tienes habilitada la búsqueda de Google Search en tiempo real. Utiliza los datos actualizados de Google Search para complementar el contexto del documento cuando la pregunta actual del usuario lo requiera para dar una respuesta precisa y de actualidad. Si complementas la respuesta con Google Search, clasifica 'outOfDomain' como false ya que la consulta ha sido satisfecha exitosamente mediante grounding web.";
      }

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          thinkingProcess: { type: Type.STRING, description: "Proceso de razonamiento, borrador o verificación detallado según el método seleccionado." },
          finalAnswer: { type: Type.STRING, description: "Respuesta final redactada para el usuario." },
          groundednessScore: { type: Type.INTEGER, description: "Puntuación de fundamentación del 0 al 100." },
          faithfulnessScore: { type: Type.INTEGER, description: "Puntuación de veracidad y ausencia de contradicciones del 0 al 100." },
          uncertaintyLevel: { type: Type.STRING, description: "Grado de incertidumbre: 'Bajo', 'Medio', 'Alto'." },
          outOfDomain: { type: Type.BOOLEAN, description: "Indica si la pregunta es de un dominio de negocio o técnico ajeno al documento." }
        },
        required: ["thinkingProcess", "finalAnswer", "groundednessScore", "faithfulnessScore", "uncertaintyLevel", "outOfDomain"]
      };

      const geminiConfig: any = {
        systemInstruction: systemInstruction,
        temperature: temperature, // User-defined low-temperature for high grounding stability
        responseMimeType: "application/json",
        responseSchema: responseSchema
      };

      if (useSearch) {
        geminiConfig.tools = [{ googleSearch: {} }];
      }

      const response = await callGeminiWithRetry(() => ai.models.generateContent({
        model: selectedModel,
        contents: prompt,
        config: geminiConfig
      }), 4, 2000, selectedModel, systemInstruction, prompt, responseSchema);

      const generationTime = Date.now() - generationStart;
      const textResponse = response.text;
      if (!textResponse) {
        throw new Error("No se obtuvo respuesta del modelo");
      }

      let cleanJson = textResponse.trim();
      if (cleanJson.startsWith("```")) {
        cleanJson = cleanJson.replace(/^```json?\s*/i, "").replace(/\s*```$/, "");
      }
      const resultData = JSON.parse(cleanJson);

      // If out of domain and NOT using search grounding, customize finalAnswer
      if (resultData.outOfDomain && !useSearch) {
        resultData.finalAnswer = `[FUERA DE DOMINIO] Como asistente especializado de DocuMind AI, he identificado que tu consulta está fuera del ámbito de este documento. Por favor, realiza una pregunta directamente vinculada con el contenido para asegurar una respuesta precisa.`;
      }

      // 5. Run Output Guardrails
      const outputGuardrail = runOutputGuardrails(resultData.finalAnswer);
      const finalResponseText = outputGuardrail.sanitizedText;

      const totalLatency = Date.now() - startTime;

      // Estimate API cost
      const promptChars = prompt.length + systemInstruction.length;
      const replyChars = textResponse.length;
      const costUsd = ((promptChars / 4) * 0.00000015) + ((replyChars / 4) * 0.0000006);

      // Compute Chunk Attributions & Chunk Utilization for observability
      const chunkAttributions = computeChunkAttributions(finalResponseText, retrievedChunks);
      const chunkUtilization = Math.round(chunkAttributions.reduce((acc, curr) => acc + curr.score, 0) / Math.max(retrievedChunks.length, 1)) || 0;

      // Extract search sources if search grounding was enabled
      const searchSources: { title: string; uri: string }[] = [];
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        for (const chunk of chunks) {
          if (chunk.web?.uri) {
            searchSources.push({
              title: chunk.web.title || chunk.web.uri,
              uri: chunk.web.uri
            });
          }
        }
      }

      const responsePayload = {
        text: finalResponseText,
        thinkingProcess: resultData.thinkingProcess || "",
        searchSources: searchSources.length > 0 ? searchSources : undefined,
        metrics: {
          latencyMs: totalLatency,
          costUsd: parseFloat(costUsd.toFixed(6)),
          groundedness: resultData.groundednessScore,
          uncertainty: resultData.uncertaintyLevel || "Bajo",
          faithfulness: resultData.faithfulnessScore,
          outOfDomain: !!resultData.outOfDomain,
          stepLatencies: {
            retrievalMs: retrievalTime,
            guardrailMs: guardrailTime,
            generationMs: generationTime
          },
          retrievedChunks: retrievedChunks,
          chunkAttributions: chunkAttributions,
          chunkUtilization: chunkUtilization,
          isCached: false
        },
        guardrails: {
          inputTriggered: false,
          outputTriggered: outputGuardrail.triggered,
          outputReason: outputGuardrail.reason
        }
      };

      // Save payload to LLMCache
      if (useCache) {
        promptCache.set(cacheKey, {
          response: responsePayload,
          timestamp: Date.now()
        });
      }

      res.json(responsePayload);
    } catch (error: any) {
      console.error("Error en chat de documento avanzado:", error);
      res.status(500).json({ error: parseGeminiError(error) });
    }
  });

  // 2b. Generate Executive Summary
  app.post("/api/documents/executive-summary", async (req, res) => {
    try {
      const { text, title, lowLatency, provider } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Falta el contenido del documento para realizar el resumen ejecutivo." });
      }

      const prompt = `Actúa como un estratega y analista de negocios de alto nivel. Analiza el siguiente documento titulado "${title || 'Sin título'}" y genera un resumen ejecutivo (Executive Summary) altamente estructurado, impactante y conciso en formato Markdown.

Asegúrate de estructurar el informe exactamente con las siguientes secciones en español:
1. **📌 Sinopsis Ejecutiva**: Un resumen gerencial condensado del propósito y alcance de este documento (máximo 3-4 líneas).
2. **🔑 Hallazgos e Indicadores Clave**: Una lista con viñetas que sintetice los datos numéricos más relevantes, términos contractuales, riesgos o decisiones críticas.
3. **🎯 Recomendaciones Operativas**: Sugerencias claras y directas de pasos prácticos a seguir por la empresa basados en la información analizada.

Sé directo y objetivo. Usa tipografía de resalte (como negritas) para métricas clave, montos monetarios o plazos.

Contenido del documento a resumir:
"""
${text}
"""`;

      if (provider === "cohere") {
        if (!process.env.COHERE_API_KEY) {
          return res.status(400).json({ error: "La clave COHERE_API_KEY no está configurada en el servidor." });
        }
        const responseText = await callCohereChat([{ role: "user", content: prompt }], "Eres un analista de negocios experto que genera resúmenes ejecutivos en Markdown estructurado.");
        return res.json({ text: responseText });
      }

      if (!apiKey) {
        return res.status(500).json({ error: "La clave GEMINI_API_KEY no está configurada en el servidor." });
      }

      // Default to low latency (gemini-3.1-flash-lite) unless explicitly set to false
      const isLowLatency = lowLatency !== false;
      const selectedModel = isLowLatency ? "gemini-3.1-flash-lite" : "gemini-3.5-flash";

      const response = await callGeminiWithRetry(() => ai.models.generateContent({
        model: selectedModel,
        contents: prompt,
      }), 4, 2000, selectedModel, undefined, prompt);

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Error en generación de resumen ejecutivo:", error);
      res.status(500).json({ error: parseGeminiError(error) });
    }
  });

  // 3. Compare multiple documents
  app.post("/api/documents/compare", async (req, res) => {
    try {
      const { documents, provider } = req.body; // array of { title, text }
      if (!documents || !Array.isArray(documents) || documents.length < 2) {
        return res.status(400).json({ error: "Por favor proporciona al menos dos documentos para comparar." });
      }

      let prompt = `Eres DocuMind AI, un consultor de inteligencia de negocio. Compara detalladamente los siguientes documentos y proporciona un informe comparativo riguroso, estructurado y formateado en Markdown.

El informe debe incluir:
1. Un cuadro o tabla comparativa que muestre los puntos clave de cada documento uno al lado del otro.
2. Principales diferencias o discrepancias identificadas.
3. Puntos de acuerdo, alineación o sinergia.
4. Conclusiones y recomendaciones de negocio estratégicas basadas en la comparación.

Por favor redacta todo el informe en un español claro, profesional y corporativo.

Documentos a comparar:
`;

      documents.forEach((doc, idx) => {
        prompt += `\n--- DOCUMENTO #${idx + 1} ---
Título: ${doc.title}
Contenido:
"""
${doc.text}
"""
\n`;
      });

      prompt += `\nGenera el informe comparativo en Markdown ahora:`;

      if (provider === "cohere") {
        if (!process.env.COHERE_API_KEY) {
          return res.status(400).json({ error: "La clave COHERE_API_KEY no está configurada en el servidor." });
        }
        const responseText = await callCohereChat([{ role: "user", content: prompt }], "Eres un consultor estratégico experto.");
        return res.json({ text: responseText });
      }

      if (!apiKey) {
        return res.status(500).json({ error: "La clave GEMINI_API_KEY no está configurada en el servidor." });
      }

      const response = await callGeminiWithRetry(() => ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      }), 4, 2000, "gemini-3.5-flash", undefined, prompt);

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Error en comparación de documentos:", error);
      res.status(500).json({ error: parseGeminiError(error) });
    }
  });

  // 4. Fine-Tuning Supervised Dataset Generator based on document terminology and contents
  app.post("/api/documents/fine-tune", async (req, res) => {
    try {
      const { text, title } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Falta el contenido del documento para generar el dataset de fine-tuning." });
      }

      const prompt = `Analiza el siguiente documento titulado "${title || 'Sin título'}" y extrae 6 pares de preguntas y respuestas (Q&A) de alta calidad técnica, financiera o legal para ser utilizados como un dataset de ajuste fino supervisado (Supervised Fine-Tuning - SFT).

Cada par debe representar una pregunta real que un usuario experto haría sobre este documento, y una respuesta detallada, fundamentada y exacta extraída de sus cláusulas o datos.

Debes devolver obligatoriamente un objeto JSON que contenga un arreglo de objetos que sigan este formato exacto:
{
  "dataset": [
    {
      "messages": [
        {"role": "user", "content": "Pregunta de negocio concreta sobre el documento"},
        {"role": "model", "content": "Respuesta fundamentada con datos y cifras exactas del texto"}
      ]
    }
  ]
}

Documento:
"""
${text}
"""`;

      if (!apiKey) {
        return res.status(500).json({ error: "La clave GEMINI_API_KEY no está configurada en el servidor." });
      }

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          dataset: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                messages: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      role: { type: Type.STRING },
                      content: { type: Type.STRING }
                    },
                    required: ["role", "content"]
                  }
                }
              },
              required: ["messages"]
            }
          }
        },
        required: ["dataset"]
      };

      const response = await callGeminiWithRetry(() => ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema
        }
      }), 4, 2000, "gemini-3.5-flash", undefined, prompt, responseSchema);

      const textResponse = response.text;
      let cleanJson = textResponse.trim();
      if (cleanJson.startsWith("```")) {
        cleanJson = cleanJson.replace(/^```json?\s*/i, "").replace(/\s*```$/, "");
      }
      const parsed = JSON.parse(cleanJson);
      
      // Let's format the dataset as a string with JSONL format (one JSON object per line)
      let jsonlOutput = "";
      if (parsed.dataset && Array.isArray(parsed.dataset)) {
        jsonlOutput = parsed.dataset.map((item: any) => JSON.stringify(item)).join("\n");
      }

      res.json({
        success: true,
        jsonl: jsonlOutput,
        pairsCount: parsed.dataset?.length || 0,
        rawJson: parsed.dataset
      });
    } catch (error: any) {
      console.error("Error en generación de dataset de fine-tuning:", error);
      res.status(500).json({ error: parseGeminiError(error) });
    }
  });

  // Serve static files / Vite dev middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
