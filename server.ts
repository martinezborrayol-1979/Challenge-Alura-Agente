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

  // Helper function to retry Gemini API calls on transient / temporary 503, 429, or UNAVAILABLE errors
  async function callGeminiWithRetry(fn: () => Promise<any>, retries = 3, delayMs = 1500): Promise<any> {
    try {
      return await fn();
    } catch (error: any) {
      const errorStr = String(error.message || error).toLowerCase();
      const isTemporary = errorStr.includes("503") || 
                          errorStr.includes("resource_exhausted") || 
                          errorStr.includes("unavailable") || 
                          errorStr.includes("overloaded") || 
                          errorStr.includes("high demand") ||
                          errorStr.includes("rate limit") ||
                          errorStr.includes("429");
                          
      if (isTemporary && retries > 0) {
        console.warn(`[Gemini Retry] Error temporal detectado: ${error.message || error}. Reintentando en ${delayMs}ms... (${retries} intentos restantes)`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return callGeminiWithRetry(fn, retries - 1, delayMs * 1.5);
      }
      throw error;
    }
  }

  // Parse errors into polite, action-oriented Spanish messages
  function parseGeminiError(error: any): string {
    const errorStr = String(error.message || error).toLowerCase();
    if (errorStr.includes("503") || errorStr.includes("unavailable") || errorStr.includes("high demand") || errorStr.includes("overloaded")) {
      return "El motor de Inteligencia Artificial (Gemini) está experimentando una alta demanda temporal de forma generalizada. Por favor, espera unos segundos y vuelve a intentarlo.";
    }
    if (errorStr.includes("rate_limit") || errorStr.includes("429") || errorStr.includes("resource_exhausted") || errorStr.includes("quota")) {
      return "Se ha alcanzado el límite de peticiones (cuota) del servicio de Inteligencia Artificial. Por favor, reintenta tu solicitud en un momento.";
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
      
      const response = await callGeminiWithRetry(() => ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "Eres DocuMind AI, un motor de inteligencia documental de élite. Tu objetivo es extraer metadatos estructurales de un documento, resumirlo detalladamente y categorizarlo adecuadamente (Financiero, Legal, Técnico, Recursos Humanos o General). Responde en español.",
          responseMimeType: "application/json",
          responseSchema: {
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
          }
        }
      }));

      const textResponse = response.text;
      if (!textResponse) {
        throw new Error("No se obtuvo respuesta del modelo Gemini");
      }

      const data = JSON.parse(textResponse.trim());
      res.json(data);
    } catch (error: any) {
      console.error("Error en análisis:", error);
      res.status(500).json({ error: parseGeminiError(error) });
    }
  });

  // 2. Chat with Document (Q&A Contextual)
  app.post("/api/documents/chat", async (req, res) => {
    try {
      const { text, query, history, lowLatency, provider } = req.body;
      if (!text || !query) {
        return res.status(400).json({ error: "Faltan datos requeridos (texto del documento o consulta)" });
      }

      const chatHistory = history || [];
      const formattedHistory = chatHistory.map((h: any) => `${h.role === 'user' ? 'Usuario' : 'Asistente'}: ${h.content}`).join("\n");

      const prompt = `Eres el asistente de preguntas y respuestas de DocuMind AI. Responde a la consulta del usuario basándote únicamente en el texto del documento que se proporciona a continuación.

Reglas estrictas:
- Basa tus respuestas ÚNICAMENTE en la información explícita del documento provisto.
- Si la respuesta no puede deducirse del documento, di amablemente: "Lo siento, no encuentro esa información en el documento."
- No inventes ni agregues información externa.
- Responde de forma clara y profesional en español.

Documento:
"""
${text}
"""

Historial de conversación previa:
${formattedHistory}

Pregunta del usuario: ${query}

Respuesta:`;

      if (provider === "cohere") {
        if (!process.env.COHERE_API_KEY) {
          return res.status(400).json({ error: "La clave COHERE_API_KEY no está configurada en el servidor." });
        }
        const cohereMessages = chatHistory.map((h: any) => ({
          role: h.role === 'user' ? 'user' : 'assistant',
          content: h.content,
        }));
        cohereMessages.push({ role: "user", content: prompt });

        const responseText = await callCohereChat(cohereMessages, "Eres DocuMind AI, un asistente experto en preguntas y respuestas sobre documentos.");
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
      }));

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Error en chat de documento:", error);
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
      }));

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
      }));

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Error en comparación de documentos:", error);
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
