import React, { useState } from "react";
import { UploadCloud, FileText, Check, AlertCircle, Sparkles, Loader2, FileSpreadsheet, Scale, Cpu, Users } from "lucide-react";
import { DocumentItem } from "../types";

interface DocumentUploaderProps {
  onAddDocument: (doc: DocumentItem) => void;
  onCancel: () => void;
}

export default function DocumentUploader({ onAddDocument, onCancel }: DocumentUploaderProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<DocumentItem["category"]>("General");
  const [content, setContent] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [isParsingPdf, setIsParsingPdf] = useState(false);

  const loadPdfJs = async (): Promise<any> => {
    if ((window as any).pdfjsLib) {
      return (window as any).pdfjsLib;
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js";
      script.onload = () => {
        const pdfjsLib = (window as any).pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
        resolve(pdfjsLib);
      };
      script.onerror = (err) => reject(err);
      document.head.appendChild(script);
    });
  };

  const extractTextFromPdf = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    const pdfjsLib = await loadPdfJs();
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    let fullText = "";
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ");
      fullText += pageText + "\n";
    }
    
    return fullText.trim();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase();
    const allowedTextExtensions = ["txt", "md", "json", "js", "ts", "csv", "xml", "html", "css"];
    
    if (extension !== "pdf" && !allowedTextExtensions.includes(extension || "")) {
      setErrorMsg("Formato no soportado. Sube solo archivos de texto (.txt, .md, .json, .csv) o documentos PDF (.pdf).");
      return;
    }

    setErrorMsg("");
    setTitle(file.name);
    
    // Auto guess category based on name
    const nameLower = file.name.toLowerCase();
    if (nameLower.includes("factura") || nameLower.includes("invoice") || nameLower.includes("cuenta") || nameLower.includes("bill") || nameLower.includes("finance")) {
      setCategory("Financiero");
    } else if (nameLower.includes("contrato") || nameLower.includes("legal") || nameLower.includes("convenio") || nameLower.includes("agreement") || nameLower.includes("nda")) {
      setCategory("Legal");
    } else if (nameLower.includes("api") || nameLower.includes("spec") || nameLower.includes("tecnico") || nameLower.includes("technical") || nameLower.includes("code")) {
      setCategory("Técnico");
    } else if (nameLower.includes("empleo") || nameLower.includes("recursos") || nameLower.includes("rrhh") || nameLower.includes("politica") || nameLower.includes("hr")) {
      setCategory("Recursos Humanos");
    }

    if (extension === "pdf") {
      setIsParsingPdf(true);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const text = await extractTextFromPdf(arrayBuffer);
        setContent(text);
      } catch (err: any) {
        console.error("Error parsing PDF:", err);
        setErrorMsg("No se pudo extraer el texto de este PDF. Asegúrate de que no esté escaneado como imagen o protegido por contraseña.");
      } finally {
        setIsParsingPdf(false);
      }
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setContent(text);
      };
      reader.readAsText(file);
    }
  };

  const loadTemplate = (type: "invoice" | "nda" | "code") => {
    if (type === "invoice") {
      setTitle("Nueva_Factura_Cloud_Enterprise_2026.txt");
      setCategory("Financiero");
      setContent(`BILLING STATEMENT - GLOBAL INFRASTRUCTURE LTD
Invoice #: GI-99212
Date: July 10, 2026
Due Date: August 10, 2026

Billed to:
DocuMind Corporation
One Market Plaza, San Francisco, CA

Items:
1. High-Performance GPU Cluster Deployment (H100 Nodes)
   - 1000 hours computing - $2.50/hour - Total: $2,500.00 USD
2. Persistent High-IOPS NVMe Block Storage (50 Terabytes)
   - Monthly service fee - Total: $1,200.00 USD

Total Payable: $3,700.00 USD

Routing Bank: Silicon Valley Bank Corp
Account: 884-321-9920-A
Swift Code: SVBSUS33`);
    } else if (type === "nda") {
      setTitle("Acuerdo_Confidencialidad_NDA_Borrador.txt");
      setCategory("Legal");
      setContent(`CONVENIO MUTUO DE CONFIDENCIALIDAD (NDA)

Este Convenio de Confidencialidad se celebra el 16 de Julio de 2026 entre:
Parte Reveladora: DocuMind Corporation, con oficinas en California.
Parte Receptora: Desarrollo y Tecnología S.A. de C.V., con oficinas en Madrid, España.

1. PROPÓSITO
Las partes planean explorar una posible relación comercial relacionada con el procesamiento automatizado de documentos con inteligencia artificial de gran escala.

2. INFORMACIÓN CONFIDENCIAL
Se entenderá por Información Confidencial todo dato técnico, comercial, código fuente, flujos de datos o información financiera revelada verbalmente o por escrito que esté marcada claramente como "Confidencial".

3. DURACIÓN DE LA OBLIGACIÓN
La obligación de no divulgación persistirá por un término de cinco (5) años contados a partir de la fecha de terminación de las pláticas bilaterales de negocio.

4. LEY DE REGENCIA
Este contrato se regirá por las leyes del Estado de Nueva York, EE. UU. y cualquier conflicto se resolverá ante sus tribunales federales.`);
    } else if (type === "code") {
      setTitle("Microservicio_Ingesta_S3_Documentos.ts");
      setCategory("Técnico");
      setContent(`// AWS S3 Ingestion Microservice - DocuMind Integration Pipeline
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import axios from "axios";

const s3 = new S3Client({ region: "us-east-1" });
const DOCUMIND_API_URL = "https://api.documind.ai/v2/documents/extract";

export async function processS3Trigger(bucketName: string, objectKey: string): Promise<any> {
  console.log(\`[Ingest] Fetching object \${objectKey} from bucket \${bucketName}\`);
  
  const response = await s3.send(new GetObjectCommand({ Bucket: bucketName, Key: objectKey }));
  const fileContent = await response.Body?.transformToString();

  if (!fileContent) {
    throw new Error("File content is empty or corrupt.");
  }

  // Forward to DocuMind Cognitive API
  const apiResponse = await axios.post(DOCUMIND_API_URL, {
    document_text: fileContent,
    extract_keys: ["Monto", "Fecha", "Emisor"],
    enable_confidence_score: true
  }, {
    headers: { "Authorization": "Bearer dm_live_prod_sample883" }
  });

  return apiResponse.data;
}`);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setErrorMsg("Por favor, ingresa un título y el contenido del documento.");
      return;
    }

    setErrorMsg("");
    setIsProcessing(true);
    setProgressStep(1); // Analysis started

    const steps = [
      "Analizando estructura gramatical y semántica...",
      "Extrayendo metadatos clave con Gemini 3.5 Flash...",
      "Calculando embeddings e indexando en almacenamiento seguro...",
      "Clasificando e integrando al panel..."
    ];

    // Simulate progress updates for a better premium feeling
    const interval = setInterval(() => {
      setProgressStep((prev) => {
        if (prev >= 4) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 1000);

    try {
      // Execute REAL backend analysis using our server endpoint!
      const response = await fetch("/api/documents/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: content,
          filename: title,
        }),
      });

      clearInterval(interval);

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "No se pudo completar la llamada al modelo AI.");
      }

      const analysisResult = await response.json();

      const newDoc: DocumentItem = {
        id: "doc-" + Date.now(),
        title: title,
        content: content,
        category: analysisResult.category || category,
        status: "Deployed",
        createdAt: new Date().toISOString(),
        analysis: analysisResult,
      };

      onAddDocument(newDoc);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Error de Inteligencia AI: ${err.message || "Fallo en el servicio. Verifica tus credenciales."}`);
      setIsProcessing(false);
    }
  };

  const getStepText = (step: number) => {
    switch (step) {
      case 1: return "Analizando estructura gramatical y semántica...";
      case 2: return "Extrayendo metadatos clave con Gemini 3.5 Flash...";
      case 3: return "Calculando embeddings e indexando en almacenamiento seguro...";
      case 4: return "Clasificando e integrando al panel...";
      default: return "Inicializando motores cognitivos...";
    }
  };

  return (
    <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden p-6 md:p-8 font-sans" id="document-uploader-panel">
      {isParsingPdf ? (
        <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
          <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mb-6" />
          <h3 className="text-base font-bold text-slate-100 mb-2">
            Leyendo Documento PDF
          </h3>
          <p className="text-sm text-slate-300 mb-2 font-medium animate-pulse">
            Extrayendo contenido de texto de forma segura...
          </p>
          <span className="text-[10px] font-bold text-slate-500 font-mono uppercase tracking-widest">
            Procesamiento del lado del cliente
          </span>
        </div>
      ) : isProcessing ? (
        <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
          <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mb-6" />
          <h3 className="text-base font-bold text-slate-100 mb-2">
            Procesando Inteligencia AI
          </h3>
          <p className="text-sm text-slate-300 mb-6 font-medium animate-pulse">
            {getStepText(progressStep)}
          </p>
          
          {/* Progress Bars */}
          <div className="w-full bg-slate-950 rounded-full h-1.5 mb-2 overflow-hidden border border-slate-800">
            <div 
              className="bg-indigo-600 h-full transition-all duration-500 rounded-full"
              style={{ width: `${(progressStep / 4) * 100}%` }}
            />
          </div>
          <span className="text-[10px] font-bold text-slate-500 font-mono">
            PASO {progressStep} DE 4
          </span>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                Ingesta de Nuevo Documento
              </h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Pega texto libre o sube un archivo de texto (.txt, .md, .csv) o un documento PDF (.pdf). DocuMind extraerá metadatos y categorizará usando IA en segundos.
              </p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-100 bg-slate-950 border border-slate-800 rounded-xl hover:bg-slate-900 transition-all cursor-pointer"
            >
              Cancelar
            </button>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-red-950/40 border border-red-900/60 rounded-xl flex items-start gap-2.5 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quick template loads */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold text-indigo-400 tracking-wide uppercase font-mono flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              Probar Plantillas Rápidas de Negocio
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => loadTemplate("invoice")}
                className="flex items-center gap-2.5 p-3 bg-slate-950/60 hover:bg-slate-950 text-left border border-slate-850 hover:border-emerald-500/40 rounded-xl text-xs text-slate-300 transition-all cursor-pointer group"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="font-semibold block text-slate-200 group-hover:text-slate-100">Factura Cloud</span>
                  <span className="text-[10px] text-slate-500 font-mono">Financiero ($3,700)</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => loadTemplate("nda")}
                className="flex items-center gap-2.5 p-3 bg-slate-950/60 hover:bg-slate-950 text-left border border-slate-850 hover:border-indigo-500/40 rounded-xl text-xs text-slate-300 transition-all cursor-pointer group"
              >
                <Scale className="w-4 h-4 text-indigo-400 shrink-0" />
                <div>
                  <span className="font-semibold block text-slate-200 group-hover:text-slate-100">Borrador NDA</span>
                  <span className="text-[10px] text-slate-500 font-mono">Contrato Legal</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => loadTemplate("code")}
                className="flex items-center gap-2.5 p-3 bg-slate-950/60 hover:bg-slate-950 text-left border border-slate-850 hover:border-cyan-500/40 rounded-xl text-xs text-slate-300 transition-all cursor-pointer group"
              >
                <Cpu className="w-4 h-4 text-cyan-400 shrink-0" />
                <div>
                  <span className="font-semibold block text-slate-200 group-hover:text-slate-100">Microservicio AWS</span>
                  <span className="text-[10px] text-slate-500 font-mono">Código Técnico</span>
                </div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Title */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-bold text-slate-300 block" htmlFor="title-input">
                Nombre del Archivo / Documento
              </label>
              <input
                type="text"
                id="title-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ej. Factura_Proveedor_04.txt o Acuerdo_Mutuo_NDA.txt"
                className="w-full bg-slate-950 border border-slate-800/80 focus:border-indigo-500 focus:bg-slate-900 rounded-xl px-3.5 py-2.5 text-xs outline-none transition-all text-slate-200 placeholder-slate-600"
              />
            </div>

            {/* Category default */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block" htmlFor="category-select">
                Categoría Sugerida (Inicial)
              </label>
              <select
                id="category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800/80 focus:border-indigo-500 focus:bg-slate-900 rounded-xl px-3 py-2.5 text-xs outline-none transition-all cursor-pointer text-slate-200"
              >
                <option value="General" className="bg-slate-900 text-slate-200">General</option>
                <option value="Financiero" className="bg-slate-900 text-slate-200">Financiero</option>
                <option value="Legal" className="bg-slate-900 text-slate-200">Legal</option>
                <option value="Técnico" className="bg-slate-900 text-slate-200">Técnico</option>
                <option value="Recursos Humanos" className="bg-slate-900 text-slate-200">Recursos Humanos</option>
              </select>
            </div>
          </div>

          {/* Drag and Drop Zone Simulator */}
          <div className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl bg-slate-950/40 hover:bg-slate-950/80 p-6 text-center transition-all relative">
            <input
              type="file"
              onChange={handleFileUpload}
              accept=".txt,.md,.json,.js,.ts,.csv,.pdf"
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              id="file-input-trigger"
            />
            <UploadCloud className="w-8 h-8 text-indigo-400 mx-auto mb-2.5 animate-pulse" />
            <h4 className="text-xs font-bold text-slate-200 mb-1">
              Arrastra tu archivo aquí o haz clic para buscar
            </h4>
            <p className="text-[10px] text-slate-500 font-mono">
              Soporta archivos de texto (.txt, .md, .csv) y documentos PDF (.pdf) (Máx. 5MB)
            </p>
          </div>

          {/* Content rich textbox */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 block" htmlFor="content-input">
              Contenido del Documento / Texto Libre
            </label>
            <textarea
              id="content-input"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Pega o escribe las cláusulas, montos, códigos, políticas o párrafos del documento que deseas que Gemini procese e indexe..."
              className="w-full h-64 text-xs font-mono p-4 bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl outline-none resize-none leading-relaxed text-slate-200 placeholder-slate-600"
            />
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 border-t border-slate-800/80 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-100 bg-slate-950 border border-slate-800 rounded-xl hover:bg-slate-900 transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md shadow-indigo-600/10 flex items-center gap-1.5 cursor-pointer"
              id="btn-trigger-ingestion"
            >
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              Guardar y Analizar con Gemini AI
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
