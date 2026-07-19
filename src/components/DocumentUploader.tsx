import React, { useState } from "react";
import { UploadCloud, FileText, Check, AlertCircle, Sparkles, Loader2, FileSpreadsheet, Scale, Cpu, Users, Tag } from "lucide-react";
import { DocumentItem } from "../types";
import { useLanguage } from "../LanguageContext";

interface DocumentUploaderProps {
  onAddDocument: (doc: DocumentItem) => void;
  onCancel: () => void;
  userRole?: 'admin' | 'viewer';
  aiProvider?: 'gemini' | 'cohere';
}

export default function DocumentUploader({ 
  onAddDocument, 
  onCancel, 
  userRole = "admin",
  aiProvider = "gemini"
}: DocumentUploaderProps) {
  const { language } = useLanguage();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<DocumentItem["category"]>("General");
  const [content, setContent] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const handleAddTag = () => {
    const trimmed = tagInput.trim().replace(/[#,]/g, "");
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

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
      setErrorMsg(
        language === "es"
          ? "Formato no soportado. Sube solo archivos de texto (.txt, .md, .json, .csv) o documentos PDF (.pdf)."
          : "Format not supported. Only upload text files (.txt, .md, .json, .csv) or PDF documents (.pdf)."
      );
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
        setErrorMsg(
          language === "es"
            ? "No se pudo extraer el texto de este PDF. Asegúrate de que no esté escaneado como imagen o protegido por contraseña."
            : "Could not extract text from this PDF. Make sure it is not scanned as an image or password-protected."
        );
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
      if (language === "es") {
        setTitle("Nueva_Factura_CFDI_4.0_Servicios_2026.txt");
        setCategory("Financiero");
        setContent(`COMPROBANTE FISCAL DIGITAL POR INTERNET (CFDI 4.0)
FACTURA COMERCIAL DE SERVICIOS - GLOBAL INFRASTRUCTURE DE MÉXICO S.A. DE C.V.
Folio Fiscal (UUID): 9F3B4A22-839D-4F11-A512-E57A5F43E2C4
Fecha de Emisión: 10 de Julio de 2026
Lugar de Expedición: CP 06600, Ciudad de México, México
Régimen Fiscal: 601 - General de Ley Personas Morales

EMISOR:
GLOBAL INFRASTRUCTURE DE MÉXICO S.A. DE C.V.
RFC: GIM160412AA9

RECEPTOR:
DOCUMIND MÉXICO S. DE R.L. DE C.V.
RFC: DME220115BB4
Domicilio Fiscal: Paseo de la Reforma 250, Juárez, Cuauhtémoc, 06600 Ciudad de México, CDMX

CONCEPTOS / SERVICIOS:
1. ClaveProdServ: 81112000 - Servicios de datos y cómputo de alto rendimiento
   - Concepto: Renta mensual de Servidor en la Nube con Nodos de GPU Dedicados (H100) para procesamiento de IA
   - Cantidad: 1.00 | Unidad: E48 - Servicio | Valor Unitario: $45,000.00 MXN | Importe: $45,000.00 MXN

2. ClaveProdServ: 81112004 - Almacenamiento Vectorial e Base de Datos Indexada
   - Concepto: Base de datos vectorial persistente de alto rendimiento (50 Terabytes SSD NVMe)
   - Cantidad: 1.00 | Unidad: E48 - Servicio | Valor Unitario: $21,600.00 MXN | Importe: $21,600.00 MXN

----------------------------------------------------------------------
SUBTOTAL: $66,600.00 MXN
IVA Trasladado (16%): $10,656.00 MXN
TOTAL NETO A PAGAR: $77,256.00 MXN (Setenta y siete mil doscientos cincuenta y seis pesos 00/100 M.N.)

MÉTODO DE PAGO: PPD - Pago en parcialidades o diferido
FORMA DE PAGO: 99 - Por definir
USO DE CFDI: G03 - Gastos en general`);
      } else {
        setTitle("New_Invoice_CFDI_4.0_Services_2026.txt");
        setCategory("Financiero");
        setContent(`DIGITAL TAX COMPROBANT VIA INTERNET (CFDI 4.0)
COMMERCIAL SERVICE INVOICE - GLOBAL INFRASTRUCTURE OF MEXICO S.A. DE C.V.
Fiscal Folio (UUID): 9F3B4A22-839D-4F11-A512-E57A5F43E2C4
Emission Date: July 10, 2026
Expedition Place: Zip Code 06600, Mexico City, Mexico
Tax Regime: 601 - General Law of Moral Persons

ISSUER:
GLOBAL INFRASTRUCTURE OF MEXICO S.A. DE C.V.
RFC: GIM160412AA9

RECEIVER:
DOCUMIND MEXICO S. DE R.L. DE C.V.
RFC: DME220115BB4
Fiscal Address: Paseo de la Reforma 250, Juarez, Cuauhtemoc, 06600 Mexico City, CDMX

CONCEPTS / SERVICES:
1. ProdServCode: 81112000 - High performance computing and data services
   - Concept: Monthly Cloud Server rent with Dedicated GPU Nodes (H100) for AI processing
   - Quantity: 1.00 | Unit: E48 - Service | Unit Value: $45,000.00 MXN | Import: $45,000.00 MXN

2. ProdServCode: 81112004 - Vector Storage and Indexed Database
   - Concept: High performance persistent vector database (50 Terabytes SSD NVMe)
   - Quantity: 1.00 | Unit: E48 - Service | Unit Value: $21,600.00 MXN | Import: $21,600.00 MXN

----------------------------------------------------------------------
SUBTOTAL: $66,600.00 MXN
VAT Transferred (16%): $10,656.00 MXN
NET TOTAL TO PAY: $77,256.00 MXN (Seventy-seven thousand two hundred fifty-six pesos 00/100 M.N.)

PAYMENT METHOD: PPD - Payment in installments or deferred
PAYMENT FORM: 99 - To define
CFDI USE: G03 - General expenses`);
      }
    } else if (type === "nda") {
      if (language === "es") {
        setTitle("Acuerdo_Confidencialidad_NDA_Borrador.txt");
        setCategory("Legal");
        setContent(`CONVENIO MUTUO DE CONFIDENCIALIDAD (NDA)

Este Convenio de Confidencialidad y No Divulgación (en adelante, el "Convenio") se celebra el 16 de Julio de 2026 entre:
Parte Reveladora: DocuMind México S. de R.L. de C.V., con domicilio en Paseo de la Reforma 250, Juárez, Cuauhtémoc, 06600 Ciudad de México, CDMX.
Parte Receptora: Desarrollo y Tecnología S.A. de C.V., con domicilio en Avenida de la Constitución 14, Monterrey, Nuevo León, México.

1. OBJETO
Las partes planean explorar una posible relación comercial relacionada con la integración de motores semánticos cognitivos de inteligencia artificial en el territorio de la República Mexicana.

2. INFORMACIÓN CONFIDENCIAL
Se entenderá por Información Confidencial todo dato técnico, comercial, código fuente, flujos de datos o información financiera revelada verbalmente o por escrito que esté marcada claramente como "Confidencial" o "Propiedad Intelectual".

3. DURACIÓN DE LA OBLIGACIÓN
La obligación de no divulgación persistirá por un término de cinco (5) años contados a partir de la fecha de firma del presente instrumento o la terminación de las pláticas bilaterales de negocio.

4. LEY APLICABLE Y JURISDICCIÓN
Este contrato se regirá e interpretará conforme a las leyes federales de los Estados Unidos Mexicanos. Para cualquier controversia, las partes se someten expresamente a la jurisdicción de los tribunales competentes de la Ciudad de México, renunciando a cualquier otro fuero que pudiere corresponderles por razón de sus domicilios presentes o futuros.`);
      } else {
        setTitle("Mutual_NDA_Confidentiality_Agreement_Draft.txt");
        setCategory("Legal");
        setContent(`MUTUAL CONFIDENTIALITY AGREEMENT (NDA)

This Confidentiality and Non-Disclosure Agreement (hereinafter, the "Agreement") is entered into on July 16, 2026 by and between:
Disclosing Party: DocuMind Mexico S. de R.L. de C.V., residing at Paseo de la Reforma 250, Juarez, Cuauhtemoc, 06600 Mexico City, CDMX.
Receiving Party: Development and Technology S.A. de C.V., residing at Avenida de la Constitucion 14, Monterrey, Nuevo Leon, Mexico.

1. PURPOSE
The parties plan to explore a possible business relationship related to the integration of cognitive semantic artificial intelligence engines in the territory of the Mexican Republic.

2. CONFIDENTIAL INFORMATION
Confidential Information shall be understood as any technical, commercial, source code, data flows, or financial information disclosed verbally or in writing that is clearly marked as "Confidential" or "Intellectual Property".

3. DURATION OF THE OBLIGATION
The non-disclosure obligation shall persist for a term of five (5) years counted from the date of signing of this instrument or the termination of the bilateral business talks.

4. APPLICABLE LAW AND JURISDICTION
This contract shall be governed by and construed in accordance with the federal laws of the United States of Mexican States. For any controversy, the parties expressly submit to the jurisdiction of the competent courts of Mexico City, waiving any other jurisdiction that may correspond to them by reason of their present or future domiciles.`);
      }
    } else if (type === "code") {
      setTitle("Microservicio_Ingesta_S3_Documentos.ts");
      setCategory("Técnico");
      setContent(`// AWS S3 Ingestion Microservice - DocuMind Integration Pipeline
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import axios from "axios";

const s3 = new S3Client({ region: "us-east-1" });
const DOCUMIND_API_URL = "https://api.documind.ai/v2/documents/extract";

export async function processS3Trigger(bucketName: string, objectKey: string): Promise<any> {
  console.log('[Ingest] Fetching object ' + objectKey + ' from bucket ' + bucketName);
  
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
      setErrorMsg(
        language === "es"
          ? "Por favor, ingresa un título y el contenido del documento."
          : "Please enter a title and document content."
      );
      return;
    }

    setErrorMsg("");
    setIsProcessing(true);
    setProgressStep(1); // Analysis started

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
        tags: tags,
      };

      onAddDocument(newDoc);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        language === "es"
          ? `Error de Inteligencia AI: ${err.message || "Fallo en el servicio. Verifica tus credenciales."}`
          : `AI Intelligence Error: ${err.message || "Service failure. Verify your credentials."}`
      );
      setIsProcessing(false);
    }
  };

  const getStepText = (step: number) => {
    switch (step) {
      case 1:
        return language === "es"
          ? "Analizando estructura gramatical y semántica..."
          : "Analyzing grammatical and semantic structure...";
      case 2:
        return language === "es"
          ? (aiProvider === "cohere" ? "Extrayendo metadatos clave con Cohere Command..." : "Extrayendo metadatos clave con Gemini 3.5 Flash...")
          : (aiProvider === "cohere" ? "Extracting key metadata with Cohere Command..." : "Extracting key metadata with Gemini 3.5 Flash...");
      case 3:
        return language === "es"
          ? "Calculando embeddings e indexando en almacenamiento seguro..."
          : "Calculating embeddings and indexing in secure vault...";
      case 4:
        return language === "es"
          ? "Clasificando e integrando al panel..."
          : "Classifying and integrating to panel...";
      default:
        return language === "es"
          ? "Inicializando motores cognitivos..."
          : "Initializing cognitive engines...";
    }
  };

  return (
    <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden p-6 md:p-8 font-sans" id="document-uploader-panel">
      {isParsingPdf ? (
        <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
          <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mb-6" />
          <h3 className="text-base font-bold text-slate-100 mb-2">
            {language === "es" ? "Leyendo Documento PDF" : "Reading PDF Document"}
          </h3>
          <p className="text-sm text-slate-300 mb-2 font-medium animate-pulse">
            {language === "es" ? "Extrayendo contenido de texto de forma segura..." : "Extracting text content securely..."}
          </p>
          <span className="text-[10px] font-bold text-slate-500 font-mono uppercase tracking-widest">
            {language === "es" ? "Procesamiento del lado del cliente" : "Client-side processing"}
          </span>
        </div>
      ) : isProcessing ? (
        <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
          <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mb-6" />
          <h3 className="text-base font-bold text-slate-100 mb-2">
            {language === "es" ? "Procesando Inteligencia AI" : "Processing AI Intelligence"}
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
            {language === "es" ? `PASO ${progressStep} DE 4` : `STEP ${progressStep} OF 4`}
          </span>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                {language === "es" ? "Ingesta de Nuevo Documento" : "Ingest New Document"}
              </h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {language === "es"
                  ? "Pega texto libre o sube un archivo de texto (.txt, .md, .csv) o un documento PDF (.pdf). DocuMind extraerá metadatos y categorizará usando IA en segundos."
                  : "Paste free text or upload a text file (.txt, .md, .csv) or a PDF document (.pdf). DocuMind will extract metadata and categorize using AI in seconds."}
              </p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-100 bg-slate-950 border border-slate-800 rounded-xl hover:bg-slate-900 transition-all cursor-pointer"
            >
              {language === "es" ? "Cancelar" : "Cancel"}
            </button>
          </div>

          {userRole === "viewer" && (
            <div className="mb-6 bg-rose-950/40 border border-rose-900/60 p-4 rounded-2xl flex items-start gap-3 text-rose-300 font-sans leading-relaxed text-xs">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-rose-200 uppercase tracking-wide text-[11px] mb-1">
                  {language === "es" ? "Acceso de Solo Lectura Activado" : "Read-Only Access Enabled"}
                </h4>
                <p>
                  {language === "es" 
                    ? "No posees permisos de escritura para registrar o procesar nuevos documentos en la bóveda. Para continuar, cambia tu rol a 'Administrador' utilizando el selector en la barra superior." 
                    : "You do not have write permissions to upload or process documents in the secure vault. Please toggle your role to 'Admin' using the selector in the top bar to continue."}
                </p>
              </div>
            </div>
          )}

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
              {language === "es" ? "Probar Plantillas Rápidas de Negocio" : "Try Quick Business Templates"}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                disabled={userRole === "viewer"}
                onClick={() => loadTemplate("invoice")}
                className="flex items-center gap-2.5 p-3 bg-slate-950/60 hover:bg-slate-950 text-left border border-slate-850 hover:border-emerald-500/40 rounded-xl text-xs text-slate-300 transition-all cursor-pointer group disabled:opacity-45 disabled:cursor-not-allowed"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="font-semibold block text-slate-200 group-hover:text-slate-100">
                    {language === "es" ? "Factura Cloud" : "Cloud Invoice"}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {language === "es" ? "Financiero ($3,700)" : "Financial ($3,700)"}
                  </span>
                </div>
              </button>
              <button
                type="button"
                disabled={userRole === "viewer"}
                onClick={() => loadTemplate("nda")}
                className="flex items-center gap-2.5 p-3 bg-slate-950/60 hover:bg-slate-950 text-left border border-slate-850 hover:border-indigo-500/40 rounded-xl text-xs text-slate-300 transition-all cursor-pointer group disabled:opacity-45 disabled:cursor-not-allowed"
              >
                <Scale className="w-4 h-4 text-indigo-400 shrink-0" />
                <div>
                  <span className="font-semibold block text-slate-200 group-hover:text-slate-100">
                    {language === "es" ? "Borrador NDA" : "NDA Draft"}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {language === "es" ? "Contrato Legal" : "Legal Contract"}
                  </span>
                </div>
              </button>
              <button
                type="button"
                disabled={userRole === "viewer"}
                onClick={() => loadTemplate("code")}
                className="flex items-center gap-2.5 p-3 bg-slate-950/60 hover:bg-slate-950 text-left border border-slate-850 hover:border-cyan-500/40 rounded-xl text-xs text-slate-300 transition-all cursor-pointer group disabled:opacity-45 disabled:cursor-not-allowed"
              >
                <Cpu className="w-4 h-4 text-cyan-400 shrink-0" />
                <div>
                  <span className="font-semibold block text-slate-200 group-hover:text-slate-100">
                    {language === "es" ? "Microservicio AWS" : "AWS Microservice"}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {language === "es" ? "Código Técnico" : "Technical Code"}
                  </span>
                </div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Title */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-bold text-slate-300 block" htmlFor="title-input">
                {language === "es" ? "Nombre del Archivo / Documento" : "Filename / Document Name"}
              </label>
              <input
                type="text"
                id="title-input"
                disabled={userRole === "viewer"}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  language === "es"
                    ? "ej. Factura_Proveedor_04.txt o Acuerdo_Mutuo_NDA.txt"
                    : "e.g., Supplier_Invoice_04.txt or Mutual_NDA_Agreement.txt"
                }
                className="w-full bg-slate-950 border border-slate-800/80 focus:border-indigo-500 focus:bg-slate-900 rounded-xl px-3.5 py-2.5 text-xs outline-none transition-all text-slate-200 placeholder-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Category default */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block" htmlFor="category-select">
                {language === "es" ? "Categoría Sugerida (Inicial)" : "Suggested Category (Initial)"}
              </label>
              <select
                id="category-select"
                disabled={userRole === "viewer"}
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800/80 focus:border-indigo-500 focus:bg-slate-900 rounded-xl px-3 py-2.5 text-xs outline-none transition-all cursor-pointer text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="General" className="bg-slate-900 text-slate-200">
                  {language === "es" ? "General" : "General"}
                </option>
                <option value="Financiero" className="bg-slate-900 text-slate-200">
                  {language === "es" ? "Financiero" : "Financial"}
                </option>
                <option value="Legal" className="bg-slate-900 text-slate-200">
                  {language === "es" ? "Legal" : "Legal"}
                </option>
                <option value="Técnico" className="bg-slate-900 text-slate-200">
                  {language === "es" ? "Técnico" : "Technical"}
                </option>
                <option value="Recursos Humanos" className="bg-slate-900 text-slate-200">
                  {language === "es" ? "Recursos Humanos" : "Human Resources"}
                </option>
              </select>
            </div>
          </div>

          {/* Custom Tags */}
          <div className="space-y-2" id="uploader-custom-tags-section">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5" htmlFor="tags-input-field">
              <Tag className="w-3.5 h-3.5 text-indigo-400" />
              {language === "es" ? "Etiquetas Personalizadas" : "Custom Tags"}
            </label>
            <div className="flex flex-col gap-2 p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <div className="flex flex-wrap gap-1.5" id="added-tags-chips-container">
                {tags.length === 0 ? (
                  <span className="text-[11px] text-slate-500 italic">
                    {language === "es" ? "Ninguna etiqueta añadida aún." : "No tags added yet."}
                  </span>
                ) : (
                  tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-indigo-950/60 text-indigo-300 border border-indigo-850/60 rounded-lg"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => setTags(tags.filter((t) => t !== tag))}
                        className="text-slate-400 hover:text-rose-400 font-bold transition-colors ml-1 cursor-pointer"
                        style={{ fontSize: '10px' }}
                      >
                        ×
                      </button>
                    </span>
                  ))
                )}
              </div>
              <div className="flex gap-2 mt-1">
                <input
                  type="text"
                  id="tags-input-field"
                  disabled={userRole === "viewer"}
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder={
                    language === "es"
                      ? "Escribe una etiqueta y presiona Enter o ','"
                      : "Type a tag and press Enter or ','"
                  }
                  className="flex-1 bg-slate-900 border border-slate-800/80 focus:border-indigo-500 rounded-lg px-3 py-1.5 text-xs outline-none text-slate-200 placeholder-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  disabled={userRole === "viewer" || !tagInput.trim()}
                  onClick={handleAddTag}
                  className="px-3 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg transition-all cursor-pointer"
                  id="btn-add-uploader-tag"
                >
                  {language === "es" ? "Añadir" : "Add"}
                </button>
              </div>
            </div>
          </div>

          {/* Drag and Drop Zone Simulator */}
          <div className={`border-2 border-dashed border-slate-800 rounded-2xl bg-slate-950/40 p-6 text-center transition-all relative ${userRole === "viewer" ? "opacity-40 cursor-not-allowed" : "hover:border-indigo-500/50 hover:bg-slate-950/80"}`}>
            <input
              type="file"
              disabled={userRole === "viewer"}
              onChange={handleFileUpload}
              accept=".txt,.md,.json,.js,.ts,.csv,.pdf"
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full disabled:cursor-not-allowed"
              id="file-input-trigger"
            />
            <UploadCloud className="w-8 h-8 text-indigo-400 mx-auto mb-2.5 animate-pulse" />
            <h4 className="text-xs font-bold text-slate-200 mb-1">
              {language === "es" ? "Arrastra tu archivo aquí o haz clic para buscar" : "Drag your file here or click to browse"}
            </h4>
            <p className="text-[10px] text-slate-500 font-mono">
              {language === "es"
                ? "Soporta archivos de texto (.txt, .md, .csv) y documentos PDF (.pdf) (Máx. 5MB)"
                : "Supports text files (.txt, .md, .csv) and PDF documents (.pdf) (Max 5MB)"}
            </p>
          </div>

          {/* Content rich textbox */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 block" htmlFor="content-input">
              {language === "es" ? "Contenido del Documento / Texto Libre" : "Document Content / Free Text"}
            </label>
            <textarea
              id="content-input"
              disabled={userRole === "viewer"}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                language === "es"
                  ? `Pega o escribe las cláusulas, montos, códigos, políticas o párrafos del documento que deseas que ${aiProvider === "cohere" ? "Cohere" : "Gemini"} procese e indexe...`
                  : `Paste or write the clauses, amounts, codes, policies, or paragraphs of the document you want ${aiProvider === "cohere" ? "Cohere" : "Gemini"} to process and index...`
              }
              className={`w-full h-64 text-xs font-mono p-4 bg-slate-950 border focus:ring-1 rounded-xl outline-none resize-none leading-relaxed text-slate-200 placeholder-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
                aiProvider === "cohere" 
                  ? "border-slate-800 focus:border-teal-500 focus:ring-teal-500" 
                  : "border-slate-800 focus:border-indigo-500 focus:ring-indigo-500"
              }`}
            />
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 border-t border-slate-800/80 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-100 bg-slate-950 border border-slate-800 rounded-xl hover:bg-slate-900 transition-all cursor-pointer"
            >
              {language === "es" ? "Cancelar" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={userRole === "viewer"}
              className={`px-5 py-2 text-xs font-bold text-white rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                aiProvider === "cohere"
                  ? "bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 shadow-teal-600/10"
                  : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-600/10"
              }`}
              id="btn-trigger-ingestion"
            >
              {aiProvider === "cohere" ? (
                <Cpu className="w-3.5 h-3.5 animate-pulse text-teal-200" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 animate-pulse text-purple-200" />
              )}
              {language === "es"
                ? `Guardar y Analizar con ${aiProvider === "cohere" ? "Cohere" : "Gemini"} AI`
                : `Save & Analyze with ${aiProvider === "cohere" ? "Cohere" : "Gemini"} AI`}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
