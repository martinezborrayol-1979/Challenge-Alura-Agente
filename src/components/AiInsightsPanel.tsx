import React, { useState, useRef, useEffect } from "react";
import { DocumentItem, ChatMessage, AnalysisData } from "../types";
import { 
  Sparkles, 
  Brain, 
  MessageSquare, 
  Send, 
  AlertTriangle, 
  ShieldCheck, 
  CheckCircle2, 
  Languages, 
  ArrowRight,
  TrendingUp,
  Cpu,
  BadgeAlert,
  Loader2,
  Download,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronUp,
  Clock,
  Shield,
  Coins,
  Check,
  X,
  Activity,
  Lock,
  Unlock,
  Database,
  Sliders,
  FileJson,
  Globe,
  ExternalLink
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useLanguage } from "../LanguageContext";
import { useToast } from "../ToastContext";
import { analyzeMessageSentiment } from "../utils/sentiment";

interface AiInsightsPanelProps {
  document: DocumentItem;
  chats: ChatMessage[];
  onSendMessage: (docId: string, messageText: string, lowLatency?: boolean, technique?: 'standard' | 'cot' | 'cove', useSearchGrounding?: boolean) => Promise<void>;
  isChatLoading: boolean;
  isAnalyzing: boolean;
  onGenerateExecutiveSummary: (docId: string, lowLatency?: boolean) => Promise<void>;
  isGeneratingSummary: boolean;
  provider?: "gemini" | "cohere";
  userRole: "admin" | "viewer";
  onSaveFeedback: (messageId: string, liked: boolean, comment?: string) => Promise<void>;
  chunkSize: number;
  setChunkSize: (val: number) => void;
  retrievalK: number;
  setRetrievalK: (val: number) => void;
  temperature: number;
  setTemperature: (val: number) => void;
  useCache: boolean;
  setUseCache: (val: boolean) => void;
}

export default function AiInsightsPanel({
  document,
  chats,
  onSendMessage,
  isChatLoading,
  isAnalyzing,
  onGenerateExecutiveSummary,
  isGeneratingSummary,
  provider = "gemini",
  userRole = "admin",
  onSaveFeedback,
  chunkSize,
  setChunkSize,
  retrievalK,
  setRetrievalK,
  temperature,
  setTemperature,
  useCache,
  setUseCache,
}: AiInsightsPanelProps) {
  const { language } = useLanguage();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"insights" | "summary" | "chat">("insights");
  const [userInput, setUserInput] = useState("");
  const [isLowLatencyMode, setIsLowLatencyMode] = useState(true);
  const [useSearchGrounding, setUseSearchGrounding] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Advanced prompting technique selection
  const [promptTechnique, setPromptTechnique] = useState<'standard' | 'cot' | 'cove'>('standard');
  
  // Expanded trace message tracking
  const [expandedTraceMsgId, setExpandedTraceMsgId] = useState<string | null>(null);

  // Feedback comment modal tracking
  const [feedbackCommentMsgId, setFeedbackCommentMsgId] = useState<string | null>(null);
  const [feedbackCommentText, setFeedbackCommentText] = useState("");

  // Fine-tuning dataset generation state and handler
  const [isGeneratingFineTune, setIsGeneratingFineTune] = useState(false);
  const [fineTuneDataset, setFineTuneDataset] = useState<{ jsonl: string; count: number } | null>(null);
  const [fineTuneError, setFineTuneError] = useState<string | null>(null);
  const [ragTuningExpanded, setRagTuningExpanded] = useState(false);

  const handleGenerateFineTuneDataset = async () => {
    setIsGeneratingFineTune(true);
    setFineTuneError(null);
    setFineTuneDataset(null);
    try {
      const response = await fetch("/api/documents/fine-tune", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: document.content, title: document.title })
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Fallo en la generación");
      }
      const result = await response.json();
      if (result.success) {
        setFineTuneDataset({ jsonl: result.jsonl, count: result.pairsCount });
        showToast(
          language === "es"
            ? `¡Dataset de Fine-Tuning generado exitosamente con ${result.pairsCount} pares Q&A!`
            : `Fine-Tuning Dataset successfully generated with ${result.pairsCount} Q&A pairs!`,
          "success"
        );
      } else {
        throw new Error("No se pudo generar el dataset correctamente");
      }
    } catch (err: any) {
      console.error(err);
      setFineTuneError(err.message || "Error al solicitar dataset al servidor.");
      showToast(
        language === "es"
          ? "Error al generar el dataset de fine-tuning"
          : "Error generating fine-tuning dataset",
        "error"
      );
    } finally {
      setIsGeneratingFineTune(false);
    }
  };

  useEffect(() => {
    // Scroll to bottom of chat when new message arrives
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chats, isChatLoading, activeTab]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isChatLoading) return;
    onSendMessage(document.id, userInput.trim(), isLowLatencyMode, promptTechnique, useSearchGrounding);
    setUserInput("");
  };

  const handleSuggestClick = (suggestion: string) => {
    if (isChatLoading) return;
    onSendMessage(document.id, suggestion, isLowLatencyMode, promptTechnique, useSearchGrounding);
  };

  const handleExportMarkdown = () => {
    if (!document) return;

    const mainTitle = language === "es" ? "Informe de Inteligencia Documental" : "Documental Intelligence Report";
    let md = `# ${mainTitle}: ${document.title}\n\n`;
    
    const creationDateLabel = language === "es" ? "Fecha de Creación" : "Creation Date";
    md += `*   **${creationDateLabel}:** ${new Date(document.createdAt).toLocaleDateString(language === "es" ? "es-ES" : "en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}\n`;
    
    const categoryLabel = language === "es" ? "Categoría" : "Category";
    md += `*   **${categoryLabel}:** ${
      language === "es"
        ? document.category === "Financiero" ? "Financiero" : document.category === "Legal" ? "Legal" : document.category === "Técnico" ? "Técnico" : document.category === "Recursos Humanos" ? "Recursos Humanos" : document.category
        : document.category === "Financiero" ? "Financial" : document.category === "Legal" ? "Legal" : document.category === "Técnico" ? "Technical" : document.category === "Recursos Humanos" ? "Human Resources" : document.category
    }\n`;
    
    if (document.analysis) {
      const langLabel = language === "es" ? "Idioma Detectado" : "Detected Language";
      const riskLabel = language === "es" ? "Nivel de Riesgo" : "Risk Level";
      const notSpecified = language === "es" ? "No especificado" : "Not specified";
      const notEvaluated = language === "es" ? "No evaluado" : "Not evaluated";
      md += `*   **${langLabel}:** ${document.analysis.language || notSpecified}\n`;
      md += `*   **${riskLabel}:** ${document.analysis.riskLevel || notEvaluated}\n`;
    }
    md += `\n---\n\n`;

    if (document.executiveSummary) {
      const execSumLabel = language === "es" ? "📌 Resumen Ejecutivo de Negocios" : "📌 Business Executive Summary";
      md += `## ${execSumLabel}\n\n`;
      md += `${document.executiveSummary}\n\n`;
      md += `---\n\n`;
    }

    if (document.analysis) {
      const aiAnalysisLabel = language === "es" ? "🧠 Análisis y Resumen General de AI" : "🧠 AI Analysis & General Summary";
      const noSummaryLabel = language === "es" ? "No hay un resumen disponible." : "No summary available.";
      md += `## ${aiAnalysisLabel}\n\n`;
      md += `${document.analysis.summary || noSummaryLabel}\n\n`;

      if (document.analysis.metadata && document.analysis.metadata.length > 0) {
        const metadataLabel = language === "es" ? "📊 Metadatos Estructurales Extraídos" : "📊 Extracted Structural Metadata";
        const keyLabel = language === "es" ? "Campo Clave" : "Key Field";
        const valueLabel = language === "es" ? "Valor Encontrado" : "Value Found";
        md += `## ${metadataLabel}\n\n`;
        md += `| ${keyLabel} | ${valueLabel} |\n`;
        md += `| :--- | :--- |\n`;
        document.analysis.metadata.forEach((item) => {
          md += `| **${item.key}** | ${item.value} |\n`;
        });
        md += `\n`;
      }

      if (document.analysis.suggestedActions && document.analysis.suggestedActions.length > 0) {
        const suggestedActionsLabel = language === "es" ? "🎯 Acciones de Negocio Sugeridas" : "🎯 Suggested Business Actions";
        md += `## ${suggestedActionsLabel}\n\n`;
        document.analysis.suggestedActions.forEach((action, idx) => {
          md += `${idx + 1}. ${action}\n`;
        });
        md += `\n`;
      }
    }

    md += `---\n`;
    md += language === "es"
      ? "*Informe exportado automáticamente desde DocuMind AI utilizando Gemini 3.5 Flash.*"
      : "*Report automatically exported from DocuMind AI using Gemini 3.5 Flash.*";

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    
    const safeTitle = document.title
      .toLowerCase()
      .replace(/[^a-z0-9ñáéíóúü]/gi, "_")
      .replace(/_+/g, "_")
      .substring(0, 50);
    
    const filenamePrefix = language === "es" ? "informe_ai_" : "ai_report_";
    link.setAttribute("download", `${filenamePrefix}${safeTitle || "document"}.md`);
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(
      language === "es"
        ? "¡Informe exportado a Markdown (.md) correctamente!"
        : "Report successfully exported to Markdown (.md)!",
      "success"
    );
  };

  const getSuggestedQueries = (category: string) => {
    switch (category) {
      case "Financiero":
        return [
          language === "es" ? "¿Cuál es el monto total neto a pagar?" : "What is the net total amount to pay?",
          language === "es" ? "¿Cuál es la fecha de vencimiento y términos?" : "What is the due date and payment terms?",
          language === "es" ? "¿Cuáles son los datos bancarios para transferencia?" : "What are the banking details for transfer?"
        ];
      case "Legal":
        return [
          language === "es" ? "¿Cuál es el límite de responsabilidad establecido?" : "What is the established limit of liability?",
          language === "es" ? "¿Bajo qué ley aplicable se rige el contrato?" : "Under which applicable law is the contract governed?",
          language === "es" ? "¿Cuáles son las obligaciones del Prestador?" : "What are the obligations of the Provider?"
        ];
      case "Técnico":
        return [
          language === "es" ? "¿Qué parámetros recibe el endpoint /v2/documents/extract?" : "What parameters does the /v2/documents/extract endpoint receive?",
          language === "es" ? "¿Cuáles son los límites de uso (rate limits) aplicables?" : "What are the applicable usage limits (rate limits)?",
          language === "es" ? "¿Cómo se realiza la autenticación de solicitudes?" : "How is request authentication performed?"
        ];
      case "Recursos Humanos":
        return [
          language === "es" ? "¿Cuáles son los días obligatorios de asistencia presencial?" : "What are the mandatory days for in-person attendance?",
          language === "es" ? "¿Cuál es el monto de estipendio remoto y para qué sirve?" : "What is the remote stipend amount and what is it for?",
          language === "es" ? "¿Cuál es la política de retorno de equipamiento?" : "What is the equipment return policy?"
        ];
      default:
        return [
          language === "es" ? "Resume los puntos clave de este documento." : "Summarize the key points of this document.",
          language === "es" ? "¿Hay algún riesgo o fecha límite que deba vigilar?" : "Are there any risks or deadlines I should watch?",
          language === "es" ? "Extrae los nombres de personas u organizaciones mencionadas." : "Extract names of people or organizations mentioned."
        ];
    }
  };

  const analysis = document.analysis;

  const renderRiskIndicator = (riskText: string = "Bajo") => {
    const textLower = riskText.toLowerCase();
    const isHigh = textLower.includes("alto") || textLower.includes("high") || textLower.includes("crítico");
    const isMedium = textLower.includes("medio") || textLower.includes("medium") || textLower.includes("moderado");

    if (isHigh) {
      return (
        <div className="flex items-start gap-2.5 p-4 bg-rose-950/20 border border-rose-900/40 rounded-2xl text-xs text-rose-200 font-sans shadow-md shadow-rose-950/10">
          <AlertTriangle className="w-4.5 h-4.5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block mb-0.5 text-rose-300 text-xs uppercase tracking-wider font-mono">
              {language === "es" ? "Riesgo Alto" : "High Risk"}
            </span>
            {riskText}
          </div>
        </div>
      );
    } else if (isMedium) {
      return (
        <div className="flex items-start gap-2.5 p-4 bg-amber-950/20 border border-amber-900/35 rounded-2xl text-xs text-amber-200 font-sans shadow-md shadow-amber-950/10">
          <BadgeAlert className="w-4.5 h-4.5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block mb-0.5 text-amber-300 text-xs uppercase tracking-wider font-mono">
              {language === "es" ? "Riesgo Moderado" : "Moderate Risk"}
            </span>
            {riskText}
          </div>
        </div>
      );
    } else {
      return (
        <div className="flex items-start gap-2.5 p-4 bg-emerald-950/20 border border-emerald-900/35 rounded-2xl text-xs text-emerald-200 font-sans shadow-md shadow-emerald-950/10">
          <ShieldCheck className="w-4.5 h-4.5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block mb-0.5 text-emerald-300 text-xs uppercase tracking-wider font-mono">
              {language === "es" ? "Riesgo Bajo" : "Low Risk"}
            </span>
            {riskText}
          </div>
        </div>
      );
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden" id="ai-insights-panel">
      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-800/80 bg-slate-950/40 p-1.5 gap-1">
        <button
          onClick={() => setActiveTab("insights")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === "insights"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
          }`}
          id="btn-tab-insights"
        >
          <Brain className="w-3.5 h-3.5 animate-pulse shrink-0" />
          <span className="truncate">{language === "es" ? "Análisis AI" : "AI Analysis"}</span>
        </button>
        <button
          onClick={() => setActiveTab("summary")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === "summary"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
          }`}
          id="btn-tab-summary"
        >
          <Sparkles className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
          <span className="truncate">{language === "es" ? "Resumen Ejecutivo" : "Executive Summary"}</span>
        </button>
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === "chat"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
          }`}
          id="btn-tab-chat"
        >
          <MessageSquare className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{language === "es" ? "Preguntar" : "Ask"}</span>
          {chats.length > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] bg-white text-indigo-700 rounded-full leading-none font-bold shrink-0">
              {chats.length}
            </span>
          )}
        </button>
      </div>

      {/* Optimization & Performance Banner */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-850/80 text-[10px] font-mono select-none shrink-0" id="performance-model-banner">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Cpu className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
          <span>{language === "es" ? "Motor AI:" : "AI Engine:"}</span>
          <span className={`font-bold transition-all ${provider === "cohere" ? "text-indigo-400" : isLowLatencyMode ? "text-emerald-400" : "text-indigo-400"}`}>
            {provider === "cohere" ? "cohere-command-r-plus-08-2024" : isLowLatencyMode ? "gemini-3.1-flash-lite" : "gemini-3.5-flash"}
          </span>
        </div>
        {provider !== "cohere" && (
          <label className="relative inline-flex items-center cursor-pointer group">
            <input 
              type="checkbox" 
              checked={isLowLatencyMode}
              onChange={(e) => setIsLowLatencyMode(e.target.checked)}
              className="sr-only peer" 
            />
            <div className="w-7 h-4 bg-slate-850 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-500 peer-checked:after:bg-emerald-400 after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-950/40 border border-slate-850 peer-checked:border-emerald-500/30"></div>
            <span className="ml-2 text-[9px] font-bold text-slate-400 group-hover:text-slate-200 transition-colors uppercase tracking-wider">
              {language === "es" ? "Baja Latencia" : "Low Latency"}
            </span>
          </label>
        )}
        {provider === "cohere" && (
          <div className="text-emerald-400 font-bold uppercase tracking-wider text-[8px] border border-emerald-950 bg-emerald-950/40 px-1.5 py-0.5 rounded">
            {language === "es" ? "Optimizado" : "Optimized"}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto relative bg-slate-900">
        {isAnalyzing ? (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-10">
            <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mb-4" />
            <h3 className="text-sm font-bold text-slate-100 mb-1 font-sans">
              {language === "es" ? "Procesando Inteligencia Semántica" : "Processing Semantic Intelligence"}
            </h3>
            <p className="text-xs text-slate-400 font-mono max-w-xs leading-relaxed animate-pulse">
              {language === "es"
                ? `Extrayendo entidades clave con ${provider === "cohere" ? "Cohere Command" : "Gemini 3.5 Flash"}...`
                : `Extracting key entities with ${provider === "cohere" ? "Cohere Command" : "Gemini 3.5 Flash"}...`}
            </p>
          </div>
        ) : null}

        {isGeneratingSummary && activeTab !== "summary" ? (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-10">
            <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mb-4" />
            <h3 className="text-sm font-bold text-slate-100 mb-1 font-sans animate-pulse">
              {language === "es" ? "Destilando Resumen Ejecutivo" : "Distilling Executive Summary"}
            </h3>
            <p className="text-xs text-slate-400 font-mono max-w-xs leading-relaxed">
              {language === "es"
                ? `Sintetizando datos clave y recomendaciones con ${provider === "cohere" ? "Cohere Command" : "Gemini 3.5 Flash"}...`
                : `Synthesizing key data and recommendations with ${provider === "cohere" ? "Cohere Command" : "Gemini 3.5 Flash"}...`}
            </p>
          </div>
        ) : null}

        {activeTab === "summary" ? (
          <div className="p-6 space-y-6 font-sans">
            {isGeneratingSummary ? (
              <div className="animate-pulse space-y-6">
                {/* Skeleton Header */}
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400/40 animate-pulse shrink-0" />
                    <div className="h-4 bg-slate-800/80 rounded w-48" />
                  </div>
                  <div className="h-8 bg-slate-800/80 rounded-lg w-24" />
                </div>

                {/* Section 1: Sinopsis */}
                <div className="border border-slate-850 rounded-2xl p-5 md:p-6 bg-slate-950/40 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-slate-800/60 rounded-lg shrink-0" />
                    <div className="h-4 bg-slate-800/60 rounded w-36" />
                  </div>
                  <div className="space-y-2.5">
                    <div className="h-3 bg-slate-800/40 rounded w-[95%]" />
                    <div className="h-3 bg-slate-800/40 rounded w-[90%]" />
                    <div className="h-3 bg-slate-800/40 rounded w-[75%]" />
                  </div>
                </div>

                {/* Section 2: Hallazgos */}
                <div className="border border-slate-850 rounded-2xl p-5 md:p-6 bg-slate-950/40 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-slate-800/60 rounded-lg shrink-0" />
                    <div className="h-4 bg-slate-800/60 rounded w-44" />
                  </div>
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex gap-3">
                        <div className="w-2 h-2 bg-slate-800/50 rounded-full mt-1.5 shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-slate-800/40 rounded w-[85%]" />
                          <div className="h-2.5 bg-slate-800/30 rounded w-[40%]" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 3: Recomendaciones */}
                <div className="border border-slate-850 rounded-2xl p-5 md:p-6 bg-slate-950/40 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-slate-800/60 rounded-lg shrink-0" />
                    <div className="h-4 bg-slate-800/60 rounded w-48" />
                  </div>
                  <div className="space-y-4">
                    {[1, 2].map((i) => (
                      <div key={i} className="flex gap-3">
                        <div className="w-4 h-4 bg-slate-850 border border-slate-800/60 rounded-md shrink-0 animate-pulse" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-slate-800/40 rounded w-[90%]" />
                          <div className="h-3 bg-slate-800/40 rounded w-[60%]" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-center p-3 bg-slate-950/40 border border-slate-850 rounded-xl text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                  {language === "es"
                    ? `Sintetizando resumen de negocios con ${provider === "cohere" ? "Cohere" : "Gemini AI"}...`
                    : `Synthesizing business summary with ${provider === "cohere" ? "Cohere" : "Gemini AI"}...`}
                </div>
              </div>
            ) : document.executiveSummary ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse animate-duration-1000 shrink-0" />
                    <span className="text-xs font-bold tracking-wider text-indigo-400 uppercase font-mono">
                      {language === "es" ? "Resumen Ejecutivo de Negocios" : "Business Executive Summary"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportMarkdown}
                      className="text-[10px] bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/40 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition-all cursor-pointer font-bold font-mono uppercase tracking-wider flex items-center gap-1.5 shrink-0"
                      title={language === "es" ? "Exportar informe a Markdown (.md)" : "Export report to Markdown (.md)"}
                      id="btn-export-summary-md"
                    >
                      <Download className="w-3.5 h-3.5 text-indigo-400" />
                      {language === "es" ? "Exportar (.md)" : "Export (.md)"}
                    </button>
                    <button
                      onClick={() => onGenerateExecutiveSummary(document.id, isLowLatencyMode)}
                      disabled={isGeneratingSummary}
                      className="text-[10px] bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/40 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition-all cursor-pointer font-bold font-mono uppercase tracking-wider flex items-center gap-1 disabled:opacity-50"
                    >
                      <TrendingUp className="w-3 h-3 text-indigo-400" />
                      {language === "es" ? "Regenerar" : "Regenerate"}
                    </button>
                  </div>
                </div>

                <div className="border border-slate-850 rounded-2xl p-5 md:p-6 bg-slate-950/50 shadow-inner">
                  <div className="prose prose-invert prose-sm max-w-none text-slate-300 font-sans leading-relaxed">
                    <div className="markdown-body">
                      <ReactMarkdown>{document.executiveSummary}</ReactMarkdown>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center p-3 bg-slate-950/40 border border-slate-850 rounded-xl text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider">
                  {provider === "cohere"
                    ? (language === "es" ? "⚡ Generado en tiempo real con Cohere Command" : "⚡ Generated in real-time with Cohere Command")
                    : isLowLatencyMode
                    ? (language === "es" ? "⚡ Generado en tiempo real con Gemini 3.1 Flash Lite" : "⚡ Generated in real-time with Gemini 3.1 Flash Lite")
                    : (language === "es" ? "⚡ Generado en tiempo real con Gemini 3.5 Flash" : "⚡ Generated in real-time with Gemini 3.5 Flash")}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-12 max-w-md mx-auto">
                <div className="p-4 bg-slate-950 border border-slate-850 rounded-full shadow-md mb-4 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-indigo-400 animate-pulse" />
                </div>
                <h3 className="text-sm font-bold text-slate-100 mb-2">
                  {language === "es" ? "¿Necesitas un Resumen Ejecutivo?" : "Need an Executive Summary?"}
                </h3>
                <p className="text-xs text-slate-400 max-w-xs leading-relaxed mb-6 font-sans">
                  {language === "es"
                    ? `Sintetiza la información crítica de este documento. ${provider === "cohere" ? "Cohere" : "Gemini"} analizará, destilará y estructurará el contenido en una sinopsis gerencial con indicadores clave y recomendaciones.`
                    : `Sinthesize critical details from this document. ${provider === "cohere" ? "Cohere" : "Gemini"} will analyze, distill, and structure the contents into a managerial summary with key metrics and insights.`}
                </p>
                <button
                  onClick={() => onGenerateExecutiveSummary(document.id, isLowLatencyMode)}
                  disabled={isGeneratingSummary}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-700/50 text-white font-bold text-xs py-3 px-6 rounded-xl shadow-lg shadow-indigo-600/10 transition-all flex items-center justify-center gap-2 cursor-pointer group"
                >
                  <TrendingUp className="w-4 h-4 text-white group-hover:-translate-y-0.5 transition-transform" />
                  {language === "es" ? "Generar Resumen Ejecutivo" : "Generate Executive Summary"}
                </button>
              </div>
            )}
          </div>
        ) : activeTab === "insights" ? (
          <div className="p-6 space-y-6 font-sans">
            {/* PANEL DE CONFIGURACIÓN RAG Y DATASET SFT (Ajuste Fino) */}
            <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/25 shrink-0 shadow-sm" id="rag-tuning-panel">
              <button
                onClick={() => setRagTuningExpanded(!ragTuningExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-950/50 hover:bg-slate-950 text-xs font-bold text-slate-300 font-mono transition-all border-b border-slate-850/40"
              >
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-400" />
                  <span>{language === "es" ? "⚙️ PANEL DE AJUSTE RAG & SFT" : "⚙️ RAG TUNING & SFT CONTROL"}</span>
                </div>
                {ragTuningExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              
              {ragTuningExpanded && (
                <div className="p-4 space-y-4 bg-slate-900/40 font-sans border-t border-slate-850/30">
                  {/* Chunk Size selector */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-semibold text-slate-300">{language === "es" ? "Tamaño de Fragmento (Chunk Size):" : "Chunk Size:"}</span>
                      <span className="font-bold text-indigo-400 font-mono">{chunkSize} chars</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 bg-slate-950 p-0.5 rounded-xl border border-slate-850">
                      {[300, 1000, 1500].map((sz) => (
                        <button
                          key={sz}
                          onClick={() => setChunkSize(sz)}
                          className={`py-1.5 text-[10px] rounded-lg font-bold transition-all cursor-pointer ${
                            chunkSize === sz
                              ? "bg-indigo-600 text-white shadow-xs"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                          title={sz === 300 ? "Precisión granular" : sz === 1000 ? "Recomendado estándar" : "Máximo contexto contextual"}
                        >
                          {sz === 300 ? "Granular" : sz === 1000 ? "Estándar" : "Contextual"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Retrieval K limit */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-semibold text-slate-300">{language === "es" ? "Límite de Recuperación (Top K):" : "Retrieval Limit (Top K):"}</span>
                      <span className="font-bold text-indigo-400 font-mono">K = {retrievalK}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 bg-slate-950 p-0.5 rounded-xl border border-slate-850">
                      {[1, 3, 5].map((k) => (
                        <button
                          key={k}
                          onClick={() => setRetrievalK(k)}
                          className={`py-1.5 text-[10px] rounded-lg font-bold transition-all cursor-pointer ${
                            retrievalK === k
                              ? "bg-indigo-600 text-white shadow-xs"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                          title={k === 1 ? "Bajo costo y latencia" : k === 3 ? "Balance óptimo" : "Completo pero mayor consumo"}
                        >
                          K = {k}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Temperature slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-semibold text-slate-300">{language === "es" ? "Temperatura Creativa:" : "Model Temperature:"}</span>
                      <span className="font-bold text-indigo-400 font-mono">{temperature.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.1"
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      className="w-full accent-indigo-500 bg-slate-950 border border-slate-850 rounded-lg cursor-pointer h-1.5"
                    />
                    <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                      <span>{language === "es" ? "Preciso (0.0)" : "Deterministic (0.0)"}</span>
                      <span>{language === "es" ? "Creativo (1.0)" : "Creative (1.0)"}</span>
                    </div>
                  </div>

                  {/* LLMCache Toggle & Clearance info */}
                  <div className="flex items-center justify-between p-2.5 bg-slate-950/60 border border-slate-850 rounded-xl text-[11px]">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-300">{language === "es" ? "Habilitar LLMCache" : "Enable LLMCache"}</span>
                      <span className="text-[9px] text-slate-500">{language === "es" ? "Reduce costos y latencia a 0ms" : "Reduces costs & latency to 0ms"}</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={useCache}
                        onChange={(e) => setUseCache(e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-8 h-4.5 bg-slate-850 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-500 peer-checked:after:bg-indigo-400 after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-950/40 border border-slate-850"></div>
                    </label>
                  </div>

                  {/* Supervised Fine-Tuning generator card */}
                  <div className="border-t border-slate-850/50 pt-3 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                      {language === "es" ? "🎯 AJUSTE FINO (FINE-TUNING)" : "🎯 SUPERVISED FINE-TUNING"}
                    </span>
                    <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
                      {language === "es" 
                        ? "Genera y descarga un dataset de entrenamiento supervisado (SFT JSONL) basado en la terminología y hechos de este documento."
                        : "Extract and download a custom supervised training dataset (SFT JSONL) based on this document."}
                    </p>
                    
                    {fineTuneDataset ? (
                      <div className="p-3 bg-indigo-950/20 border border-indigo-900/40 rounded-xl space-y-2 text-xs">
                        <div className="flex items-center gap-1.5 text-indigo-400 font-semibold font-sans">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{language === "es" ? `¡Dataset Generado! (${fineTuneDataset.count} Pares Q&A)` : `Dataset Generated! (${fineTuneDataset.count} Q&A Pairs)`}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const blob = new Blob([fineTuneDataset.jsonl], { type: "application/jsonl;charset=utf-8;" });
                            const url = URL.createObjectURL(blob);
                            const link = window.document.createElement("a");
                            link.href = url;
                            link.setAttribute("download", `${document.title.toLowerCase().replace(/[^a-z0-9]/g, "_")}_tuning.jsonl`);
                            window.document.body.appendChild(link);
                            link.click();
                            window.document.body.removeChild(link);
                            URL.revokeObjectURL(url);
                            showToast(
                              language === "es"
                                ? "¡Dataset de Fine-Tuning descargado correctamente!"
                                : "Fine-Tuning Dataset successfully downloaded!",
                              "success"
                            );
                          }}
                          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-3 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-600/10 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{language === "es" ? "Descargar Dataset .jsonl" : "Download Dataset .jsonl"}</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleGenerateFineTuneDataset}
                        disabled={isGeneratingFineTune}
                        className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/40 text-slate-300 font-bold py-2 px-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isGeneratingFineTune ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                            <span className="font-mono">{language === "es" ? "Generando Dataset..." : "Extracting Q&A Dataset..."}</span>
                          </>
                        ) : (
                          <>
                            <FileJson className="w-3.5 h-3.5 text-indigo-400" />
                            <span>{language === "es" ? "Generar Dataset de Fine-Tuning" : "Generate Fine-Tuning Dataset"}</span>
                          </>
                        )}
                      </button>
                    )}
                    {fineTuneError && (
                      <span className="block text-[10px] text-rose-400 font-mono mt-1">⚠️ {fineTuneError}</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Category and Summary */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/40 pb-2.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                  <span className="text-xs font-bold tracking-wider text-indigo-400 uppercase font-mono">
                    {language === "es" ? "Análisis Inteligente AI" : "Smart AI Insights"}
                  </span>
                </div>
                {(analysis || document.executiveSummary) && (
                  <button
                    onClick={handleExportMarkdown}
                    className="text-[10px] bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/40 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition-all cursor-pointer font-bold font-mono uppercase tracking-wider flex items-center gap-1.5 shrink-0"
                    title={language === "es" ? "Exportar informe a Markdown (.md)" : "Export report to Markdown (.md)"}
                    id="btn-export-insights-md"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-400" />
                    {language === "es" ? "Exportar (.md)" : "Export (.md)"}
                  </button>
                )}
              </div>
              <p className="text-sm text-slate-300 leading-relaxed bg-slate-950 p-4 rounded-2xl border border-slate-850">
                {analysis?.summary || (language === "es" 
                  ? "No hay análisis disponible para este documento. Haz clic en 'Reanalizar con AI' para generarlo de forma inteligente." 
                  : "No analysis available for this document. Click 'Reanalyze with AI' to process it.")}
              </p>
            </div>

            {/* Language Banner */}
            {analysis?.language && (
              <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950/60 px-3 py-2 rounded-xl border border-slate-850">
                <Languages className="w-3.5 h-3.5 text-indigo-400" />
                <span>{language === "es" ? "Idioma Detectado:" : "Detected Language:"} <strong className="text-slate-200 font-bold">{analysis.language}</strong></span>
              </div>
            )}

            {/* Extraction Table */}
            {analysis && analysis.metadata && analysis.metadata.length > 0 && (
              <div className="space-y-3">
                <span className="text-xs font-bold tracking-wider text-indigo-400 uppercase font-mono block">
                  {language === "es" ? "Metadatos Estructurales Extraídos" : "Extracted Structural Metadata"}
                </span>
                <div className="border border-slate-850 rounded-2xl overflow-hidden bg-slate-950/40 shadow-sm">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-950 border-b border-slate-850">
                        <th className="px-4 py-2.5 font-bold text-slate-300 font-mono w-1/3">
                          {language === "es" ? "Campo Clave" : "Key Field"}
                        </th>
                        <th className="px-4 py-2.5 font-bold text-slate-300">
                          {language === "es" ? "Valor Encontrado" : "Value Found"}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850/60">
                      {analysis.metadata.map((meta, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-2.5 font-semibold text-slate-400 font-mono align-top">{meta.key}</td>
                          <td className="px-4 py-2.5 text-slate-200 font-sans leading-relaxed">{meta.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Suggested actions */}
            {analysis && analysis.suggestedActions && analysis.suggestedActions.length > 0 && (
              <div className="space-y-3">
                <span className="text-xs font-bold tracking-wider text-indigo-400 uppercase font-mono block">
                  {language === "es" ? "Acciones de Negocio Sugeridas" : "Suggested Business Actions"}
                </span>
                <div className="space-y-2">
                  {analysis.suggestedActions.map((action, idx) => {
                    const parts = action.split(":");
                    const title = parts[0];
                    const desc = parts.slice(1).join(":");
                    return (
                      <div key={idx} className="flex gap-3 p-3.5 bg-slate-950/60 hover:bg-slate-950 border border-slate-850 rounded-xl transition-all group">
                        <div className="w-5 h-5 rounded-full bg-indigo-950 border border-indigo-900/60 flex items-center justify-center shrink-0 text-[10px] font-bold text-indigo-400 mt-0.5 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                          {idx + 1}
                        </div>
                        <div className="text-xs leading-relaxed text-slate-400 font-sans">
                          {title && desc ? (
                            <>
                              <strong className="text-slate-200 font-bold block mb-0.5">{title.trim()}</strong>
                              {desc.trim()}
                            </>
                          ) : (
                            action
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Risk Index */}
            {analysis && (
              <div className="space-y-3">
                <span className="text-xs font-bold tracking-wider text-indigo-400 uppercase font-mono block">
                  {language === "es" ? "Auditoría de Cumplimiento & Riesgo" : "Compliance & Risk Audit"}
                </span>
                {renderRiskIndicator(analysis.riskLevel)}
              </div>
            )}
          </div>
        ) : (
          /* CHAT MODULE */
          <div className="flex flex-col h-full bg-slate-900">
            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px]">
              {chats.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-6 px-4 text-center text-slate-400">
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-full shadow-md mb-3">
                    <Sparkles className="w-6 h-6 text-indigo-400 animate-pulse" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-100 mb-1">
                    {language === "es" ? "Asistente Contextual DocuMind" : "DocuMind Contextual Assistant"}
                  </h4>
                  <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed font-sans mb-4">
                    {language === "es"
                      ? `Haz preguntas específicas sobre cláusulas, montos o detalles de este documento. ${provider === "cohere" ? "Cohere" : "Gemini"} tiene acceso inmediato a su contenido.`
                      : `Ask specific questions about clauses, pricing, or terms inside this document. ${provider === "cohere" ? "Cohere" : "Gemini"} has direct contextual access.`}
                  </p>

                  {/* Suggestion Quick Chips */}
                  <div className="w-full space-y-2 mt-2">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest font-mono block text-left px-1">
                      {language === "es" ? "Preguntas Sugeridas" : "Suggested Questions"}
                    </span>
                    <div className="flex flex-col gap-1.5 text-left">
                      {getSuggestedQueries(document.category).map((suggest, index) => (
                        <button
                          key={index}
                          onClick={() => handleSuggestClick(suggest)}
                          className="text-left text-xs bg-slate-950 hover:bg-slate-900 p-2.5 rounded-xl border border-slate-850 hover:border-indigo-500/40 text-slate-300 transition-all font-sans cursor-pointer group flex items-center justify-between"
                        >
                          <span className="truncate pr-4 font-medium">{suggest}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 shrink-0 transition-colors" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {chats.map((msg) => {
                    const isTraceExpanded = expandedTraceMsgId === msg.id;
                    const isFeedbackInputVisible = feedbackCommentMsgId === msg.id;
                    const sentiment = msg.role === "assistant" ? analyzeMessageSentiment(msg) : null;
                    
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${
                          msg.role === "user" ? "items-end" : "items-start"
                        }`}
                      >
                        {/* Thinking Process box (Chain-of-Thought or Chain-of-Verification) */}
                        {msg.role === "assistant" && msg.thinkingProcess && (
                          <div className="mb-2 w-[85%] text-[10px] bg-slate-950/70 border border-slate-850/60 rounded-xl p-3 text-slate-400 font-mono select-text leading-relaxed">
                            <div className="flex items-center gap-1.5 text-indigo-400 font-bold uppercase tracking-wider text-[9px] mb-1.5 border-b border-slate-850/40 pb-1">
                              <Brain className="w-3 h-3 text-indigo-400" />
                              <span>
                                {msg.promptTechnique === "cot"
                                  ? (language === "es" ? "Proceso de Razonamiento (Chain-of-Thought)" : "Reasoning Process (Chain-of-Thought)")
                                  : (language === "es" ? "Autoverificación de Hechos (Chain-of-Verification)" : "Fact Self-Verification (Chain-of-Verification)")}
                              </span>
                            </div>
                            <p className="whitespace-pre-wrap">{msg.thinkingProcess}</p>
                          </div>
                        )}

                        <div
                          className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed shadow-sm relative group/msg ${
                            msg.role === "user"
                              ? "bg-indigo-600 text-white font-medium"
                              : `bg-slate-950 text-slate-200 border border-slate-850 ${
                                  sentiment === "positive"
                                    ? "border-l-4 border-l-emerald-500 bg-emerald-950/10"
                                    : sentiment === "critical"
                                    ? "border-l-4 border-l-rose-500 bg-rose-950/10"
                                    : "border-l-4 border-l-slate-500/50 bg-slate-950"
                                }`
                          }`}
                        >
                          {/* Main Text Content */}
                          <span className="whitespace-pre-wrap font-sans block">{msg.content}</span>

                          {/* Google Search Grounding Sources */}
                          {msg.role === "assistant" && msg.searchSources && msg.searchSources.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1.5" id={`search-sources-${msg.id}`}>
                              <span className="text-[9px] font-mono font-bold text-sky-400 uppercase tracking-widest block flex items-center gap-1 select-none">
                                <Globe className="w-3 h-3 text-sky-400 shrink-0" />
                                {language === "es" ? "Fuentes de Google Search:" : "Google Search Sources:"}
                              </span>
                              <div className="flex flex-wrap gap-1.5 pt-0.5">
                                {msg.searchSources.map((source, sIdx) => (
                                  <a
                                    key={sIdx}
                                    href={source.uri}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    referrerPolicy="no-referrer"
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-sky-950/40 hover:bg-sky-900/40 border border-sky-900/30 hover:border-sky-500/40 rounded-lg text-[10px] text-sky-300 font-sans hover:text-sky-100 transition-all select-text shrink-0"
                                    id={`search-source-${msg.id}-${sIdx}`}
                                  >
                                    <span className="max-w-[140px] truncate font-medium">{source.title}</span>
                                    <ExternalLink className="w-2.5 h-2.5 text-sky-400 shrink-0" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Metadata & Controls Footer */}
                        <div className="flex flex-wrap items-center gap-3 text-[9px] text-slate-500 mt-1.5 px-1 font-mono w-full select-none justify-between">
                          <div className="flex items-center gap-2">
                            <span>{msg.timestamp}</span>

                            {sentiment && (
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider font-bold border ${
                                sentiment === "positive"
                                  ? "bg-emerald-950/60 text-emerald-400 border-emerald-900/40"
                                  : sentiment === "critical"
                                  ? "bg-rose-950/60 text-rose-400 border-rose-900/40"
                                  : "bg-slate-950/60 text-slate-400 border-slate-800"
                              }`}>
                                <span className={`w-1 h-1 rounded-full ${
                                  sentiment === "positive"
                                    ? "bg-emerald-400 animate-pulse"
                                    : sentiment === "critical"
                                    ? "bg-rose-400 animate-pulse"
                                    : "bg-slate-400"
                                }`} />
                                <span>
                                  {language === "es"
                                    ? (sentiment === "positive" ? "Tono: Positivo" : sentiment === "critical" ? "Tono: Crítico" : "Tono: Neutro")
                                    : (sentiment === "positive" ? "Tone: Positive" : sentiment === "critical" ? "Tone: Critical" : "Tone: Neutral")
                                  }
                                </span>
                              </span>
                            )}
                            
                            {msg.promptTechnique && msg.role === "assistant" && (
                              <span className="bg-indigo-950/80 text-indigo-400 border border-indigo-900/40 px-1.5 py-0.2 rounded text-[8px] uppercase tracking-wider font-bold">
                                {msg.promptTechnique}
                              </span>
                            )}

                            {/* Observability Expander Toggle */}
                            {msg.role === "assistant" && (msg.metrics || msg.guardrails) && (
                              <button
                                type="button"
                                onClick={() => setExpandedTraceMsgId(isTraceExpanded ? null : msg.id)}
                                className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-all cursor-pointer border ${
                                  isTraceExpanded 
                                    ? "bg-indigo-900/40 border-indigo-500/30 text-indigo-300 font-bold" 
                                    : "bg-slate-950 hover:bg-slate-850 border-slate-800 text-slate-400 hover:text-slate-200"
                                }`}
                                title={language === "es" ? "Ver Trazabilidad y Guardrails de la cadena" : "View Chain Traceability and Guardrails"}
                              >
                                <Activity className={`w-2.5 h-2.5 ${isTraceExpanded ? "animate-pulse" : ""}`} />
                                <span>{language === "es" ? "Trazabilidad RAG" : "RAG Trace"}</span>
                                {isTraceExpanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                              </button>
                            )}
                          </div>

                          {/* Feedback Thumbs Widget */}
                          {msg.role === "assistant" && (
                            <div className="flex items-center gap-1.5 bg-slate-950/40 border border-slate-850/40 px-1.5 py-0.5 rounded-lg">
                              <button
                                type="button"
                                onClick={async () => {
                                  if (onSaveFeedback) {
                                    await onSaveFeedback(msg.id, true);
                                  }
                                  setFeedbackCommentMsgId(feedbackCommentMsgId === msg.id ? null : msg.id);
                                }}
                                className={`hover:scale-110 transition-transform cursor-pointer p-0.5 ${
                                  msg.feedback?.liked === true 
                                    ? "text-emerald-400 font-bold" 
                                    : "text-slate-500 hover:text-emerald-400"
                                }`}
                                title={language === "es" ? "Respuesta útil" : "Helpful response"}
                              >
                                <ThumbsUp className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (onSaveFeedback) {
                                    await onSaveFeedback(msg.id, false);
                                  }
                                  setFeedbackCommentMsgId(msg.id);
                                }}
                                className={`hover:scale-110 transition-transform cursor-pointer p-0.5 ${
                                  msg.feedback?.liked === false 
                                    ? "text-rose-400 font-bold" 
                                    : "text-slate-500 hover:text-rose-400"
                                }`}
                                title={language === "es" ? "Respuesta no útil" : "Unhelpful response"}
                              >
                                <ThumbsDown className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Inline Feedback Comment Form */}
                        {msg.role === "assistant" && isFeedbackInputVisible && (
                          <div className="mt-2 w-[85%] bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-[10px] animate-in fade-in slide-in-from-top-1">
                            <span className="text-slate-400 block font-mono font-bold uppercase tracking-wider mb-1.5">
                              {language === "es" ? "📝 Añadir Comentario de Auditoría" : "📝 Add Audit Feedback"}
                            </span>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={feedbackCommentText}
                                onChange={(e) => setFeedbackCommentText(e.target.value)}
                                placeholder={language === "es" ? "Ej: Faltó indicar la tasa de interés, alucinó, etc." : "e.g. Missed interest rate details, etc."}
                                className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[10px] text-slate-200 outline-none placeholder-slate-600 focus:border-indigo-500 transition-all font-sans"
                              />
                              <button
                                type="button"
                                onClick={async () => {
                                  if (onSaveFeedback) {
                                    await onSaveFeedback(msg.id, !!msg.feedback?.liked, feedbackCommentText);
                                  }
                                  setFeedbackCommentText("");
                                  setFeedbackCommentMsgId(null);
                                }}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 rounded-lg font-sans font-bold flex items-center justify-center shrink-0 cursor-pointer"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setFeedbackCommentText("");
                                  setFeedbackCommentMsgId(null);
                                }}
                                className="bg-slate-900 hover:bg-slate-800 text-slate-400 px-2 rounded-lg font-sans border border-slate-800 shrink-0 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                            {msg.feedback?.comment && (
                              <div className="mt-2 bg-slate-900/60 p-2 rounded-lg border border-slate-850/60 text-[9px] text-indigo-300">
                                <span className="font-bold uppercase tracking-wider block mb-0.5">{language === "es" ? "Registrado:" : "Logged:"}</span>
                                <span className="font-sans italic">"{msg.feedback.comment}"</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Observability Trace & Metrics Panel */}
                        {msg.role === "assistant" && isTraceExpanded && (
                          <div className="mt-2.5 w-[95%] bg-slate-950 border border-indigo-950/40 rounded-2xl overflow-hidden font-mono text-[10px] leading-relaxed shadow-xl animate-in fade-in zoom-in-95 duration-200 select-text">
                            
                            {/* Panel Header */}
                            <div className="bg-indigo-950/45 px-4 py-2 border-b border-slate-850 flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <Activity className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                                <span className="font-bold text-slate-200 uppercase tracking-wider text-[9px]">
                                  {language === "es" ? "Panel de Observabilidad RAG Trace" : "RAG Trace Observability Panel"}
                                </span>
                              </div>
                              <span className="text-[8px] bg-indigo-900/40 text-indigo-400 px-1.5 py-0.2 rounded font-bold uppercase tracking-wider">
                                {msg.promptTechnique}
                              </span>
                            </div>

                            <div className="p-4 space-y-4">
                              {/* 1. Core Metrics Micro Grid */}
                              {msg.metrics && (
                                <div className="grid grid-cols-3 gap-2.5">
                                  <div className="bg-slate-900 border border-slate-850 rounded-xl p-2.5 text-left">
                                    <div className="flex items-center gap-1 text-slate-500 text-[8px] uppercase font-bold tracking-widest mb-1">
                                      <Clock className="w-3 h-3 text-emerald-400" />
                                      <span>{language === "es" ? "Latencia" : "Latency"}</span>
                                    </div>
                                    <span className="text-slate-100 font-sans font-bold text-xs">{msg.metrics.latencyMs}ms</span>
                                  </div>
                                  <div className="bg-slate-900 border border-slate-850 rounded-xl p-2.5 text-left">
                                    <div className="flex items-center gap-1 text-slate-500 text-[8px] uppercase font-bold tracking-widest mb-1">
                                      <Coins className="w-3 h-3 text-amber-400" />
                                      <span>{language === "es" ? "Costo" : "Cost"}</span>
                                    </div>
                                    <span className="text-slate-100 font-sans font-bold text-xs">${msg.metrics.costUsd.toFixed(5)} <span className="text-[8px] text-slate-500">USD</span></span>
                                  </div>
                                  <div className="bg-slate-900 border border-slate-850 rounded-xl p-2.5 text-left">
                                    <div className="flex items-center gap-1 text-slate-500 text-[8px] uppercase font-bold tracking-widest mb-1">
                                      <Brain className="w-3 h-3 text-cyan-400" />
                                      <span>{language === "es" ? "Certeza" : "Confidence"}</span>
                                    </div>
                                    <span className={`px-1.5 py-0.2 rounded font-bold text-[9px] uppercase tracking-wider ${
                                      msg.metrics.uncertainty === "Bajo" 
                                        ? "bg-emerald-950 text-emerald-400 border border-emerald-900/30" 
                                        : msg.metrics.uncertainty === "Medio" 
                                        ? "bg-amber-950 text-amber-400 border border-amber-900/30" 
                                        : "bg-rose-950 text-rose-400 border border-rose-900/30"
                                    }`}>
                                      {msg.metrics.uncertainty === "Bajo" ? "Alta" : msg.metrics.uncertainty === "Medio" ? "Media" : "Baja"}
                                    </span>
                                  </div>
                                </div>
                              )}

                              {/* 2. Response Quality Progress Bars */}
                              {msg.metrics && (
                                <div className="space-y-2.5">
                                  <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest border-b border-slate-850/40 pb-0.5 block">
                                    {language === "es" ? "Evaluación de Calidad del Modelo" : "Model Quality Evaluation"}
                                  </span>
                                  <div className="space-y-1.5">
                                    <div className="flex items-center justify-between text-[9px]">
                                      <span className="text-slate-400">{language === "es" ? "Fundamentación (Groundedness):" : "Groundedness:"}</span>
                                      <span className="font-bold text-indigo-400">{msg.metrics.groundedness}/100</span>
                                    </div>
                                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-850">
                                      <div 
                                        className="bg-indigo-500 h-full transition-all duration-500" 
                                        style={{ width: `${msg.metrics.groundedness}%` }} 
                                      />
                                    </div>
                                  </div>

                                  <div className="space-y-1.5">
                                    <div className="flex items-center justify-between text-[9px]">
                                      <span className="text-slate-400">{language === "es" ? "Veracidad (Faithfulness):" : "Faithfulness:"}</span>
                                      <span className="font-bold text-emerald-400">{msg.metrics.faithfulness}/100</span>
                                    </div>
                                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-850">
                                      <div 
                                        className="bg-emerald-500 h-full transition-all duration-500" 
                                        style={{ width: `${msg.metrics.faithfulness}%` }} 
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* 3. Security Guardrails Indicators */}
                              {msg.guardrails && (
                                <div className="space-y-2">
                                  <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest border-b border-slate-850/40 pb-0.5 block">
                                    {language === "es" ? "Rieles de Seguridad (Guardrails)" : "Security Guardrails"}
                                  </span>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className={`p-2 rounded-xl border flex items-start gap-1.5 ${
                                      msg.guardrails.inputTriggered 
                                        ? "bg-rose-950/20 border-rose-900/40 text-rose-300" 
                                        : "bg-emerald-950/20 border-emerald-900/40 text-emerald-300"
                                    }`}>
                                      <Shield className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                      <div>
                                        <span className="font-bold text-[8px] block uppercase tracking-wider">{language === "es" ? "Filtro Entrada" : "Input Filter"}</span>
                                        <span>{msg.guardrails.inputTriggered ? (language === "es" ? "⚠️ Bloqueado" : "⚠️ Flagged") : (language === "es" ? "✅ Limpio" : "✅ Approved")}</span>
                                        {msg.guardrails.inputReason && <span className="block text-[8px] text-rose-400 mt-1">{msg.guardrails.inputReason}</span>}
                                      </div>
                                    </div>

                                    <div className={`p-2 rounded-xl border flex items-start gap-1.5 ${
                                      msg.guardrails.outputTriggered 
                                        ? "bg-amber-950/20 border-amber-900/40 text-amber-300" 
                                        : "bg-emerald-950/20 border-emerald-900/40 text-emerald-300"
                                    }`}>
                                      <Shield className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                      <div>
                                        <span className="font-bold text-[8px] block uppercase tracking-wider">{language === "es" ? "Filtro Salida" : "Output Filter"}</span>
                                        <span>{msg.guardrails.outputTriggered ? (language === "es" ? "⚡ Sanitizado" : "⚡ Sanitized") : (language === "es" ? "✅ Limpio" : "✅ Approved")}</span>
                                        {msg.guardrails.outputReason && <span className="block text-[8px] text-amber-400 mt-1">{msg.guardrails.outputReason}</span>}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* 4. RAG Pipeline Stage Latency breakdown */}
                              {msg.metrics && msg.metrics.stepLatencies && (
                                <div className="space-y-2">
                                  <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest border-b border-slate-850/40 pb-0.5 block">
                                    {language === "es" ? "Análisis del Ciclo de la Cadena (RAG Stage)" : "Chain Cycle Breakdown"}
                                  </span>
                                  <div className="space-y-1 text-[9px] text-slate-300 bg-slate-900/60 p-2 border border-slate-850 rounded-xl divide-y divide-slate-850/40">
                                    <div className="flex justify-between py-1">
                                      <span className="text-slate-500">1. {language === "es" ? "Recuperación (Fragmentación + Re-ranking):" : "Retrieval (Semantic Chunking & Re-ranking):"}</span>
                                      <span className="text-indigo-400 font-sans font-semibold">{msg.metrics.stepLatencies.retrievalMs}ms</span>
                                    </div>
                                    <div className="flex justify-between py-1">
                                      <span className="text-slate-500">2. {language === "es" ? "Validación de Guardrails (Entrada/Salida):" : "Guardrail Audit Validation:"}</span>
                                      <span className="text-indigo-400 font-sans font-semibold">{msg.metrics.stepLatencies.guardrailMs}ms</span>
                                    </div>
                                    <div className="flex justify-between py-1">
                                      <span className="text-slate-500">3. {language === "es" ? "Inferencia de Generación de Lenguaje (LLM):" : "Language Generation Inference (LLM):"}</span>
                                      <span className="text-indigo-400 font-sans font-semibold">{msg.metrics.stepLatencies.generationMs}ms</span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* 4.5 Chunk Utilization observability score */}
                              {msg.metrics && msg.metrics.chunkUtilization !== undefined && (
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between text-[9px]">
                                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[8px]">
                                      {language === "es" ? "Utilización de Fragmentos (Chunk Utilization):" : "Chunk Utilization:"}
                                    </span>
                                    <span className={`font-bold font-mono ${msg.metrics.chunkUtilization > 60 ? "text-emerald-400" : msg.metrics.chunkUtilization > 30 ? "text-amber-400" : "text-rose-400"}`}>
                                      {msg.metrics.chunkUtilization}%
                                    </span>
                                  </div>
                                  <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-850">
                                    <div 
                                      className={`h-full transition-all duration-500 ${
                                        msg.metrics.chunkUtilization > 60 ? "bg-emerald-500" : msg.metrics.chunkUtilization > 30 ? "bg-amber-500" : "bg-rose-500"
                                      }`}
                                      style={{ width: `${msg.metrics.chunkUtilization}%` }} 
                                    />
                                  </div>
                                  <p className="text-[8px] text-slate-500 leading-normal font-sans italic">
                                    {msg.metrics.chunkUtilization < 40 
                                      ? (language === "es" 
                                        ? "💡 Utilización baja: El modelo lee mucho texto irrelevante. Considera reducir el Tamaño del Fragmento (Chunk Size) para optimizar la latencia y los costos."
                                        : "💡 Low utilization: The model is reading too much irrelevant context. Consider reducing the Chunk Size to lower latency and costs.")
                                      : (language === "es"
                                        ? "✅ Utilización óptima: Los fragmentos recuperados contienen alta densidad de información relevante."
                                        : "✅ Optimal utilization: The retrieved chunks contain high density of relevant facts.")
                                    }
                                  </p>
                                </div>
                              )}

                              {/* 5. Semantic Retrieved Context Chunks & Attributions */}
                              {msg.metrics && (msg.metrics.chunkAttributions || msg.metrics.retrievedChunks) && (
                                <div className="space-y-2.5">
                                  <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest border-b border-slate-850/40 pb-0.5 block">
                                    {language === "es" ? "Fragmentos Semánticos & Atribución de Hechos" : "Semantic Chunks & Fact Attributions"}
                                  </span>
                                  <div className="space-y-2">
                                    {msg.metrics.chunkAttributions && msg.metrics.chunkAttributions.length > 0 ? (
                                      msg.metrics.chunkAttributions.map((attr, cIdx) => (
                                        <div key={cIdx} className="bg-slate-900 border border-slate-850 rounded-xl p-3 relative text-slate-400 text-[9px] leading-relaxed">
                                          <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-1 font-bold text-indigo-400 text-[8px] uppercase tracking-wider">
                                              <Database className="w-3 h-3 text-indigo-400 shrink-0" />
                                              <span>{language === "es" ? `Fragmento Semántico #${cIdx + 1}` : `Semantic Chunk #${cIdx + 1}`}</span>
                                            </div>
                                            <div className="flex gap-1.5">
                                              <span className={`px-1.5 py-0.2 rounded font-bold text-[8px] ${
                                                attr.attributed 
                                                  ? "bg-emerald-950 text-emerald-300 border border-emerald-900/30" 
                                                  : "bg-slate-950 text-slate-500 border border-slate-850/40"
                                              }`}>
                                                {attr.attributed ? (language === "es" ? "🎯 Atribuido" : "🎯 Attributed") : (language === "es" ? "⚪ No Atribuido" : "⚪ Unattributed")}
                                              </span>
                                              <span className="px-1.5 py-0.2 rounded font-bold text-[8px] bg-indigo-950 text-indigo-300 border border-indigo-900/30">
                                                {language === "es" ? "Relevancia:" : "Relevance:"} {attr.score}%
                                              </span>
                                            </div>
                                          </div>
                                          <p className="whitespace-pre-wrap select-text">{attr.chunk.substring(0, 250)}...</p>
                                        </div>
                                      ))
                                    ) : msg.metrics.retrievedChunks && msg.metrics.retrievedChunks.length > 0 ? (
                                      msg.metrics.retrievedChunks.map((chunk, cIdx) => (
                                        <div key={cIdx} className="bg-slate-900 border border-slate-850 rounded-xl p-3 relative text-slate-400 text-[9px] leading-relaxed">
                                          <div className="flex items-center gap-1 font-bold text-indigo-400 text-[8px] uppercase tracking-wider mb-1.5">
                                            <Database className="w-3 h-3 text-indigo-400 shrink-0" />
                                            <span>{language === "es" ? `Fragmento Semántico #${cIdx + 1}` : `Semantic Chunk #${cIdx + 1}`}</span>
                                          </div>
                                          <p className="whitespace-pre-wrap select-text">{chunk.substring(0, 250)}...</p>
                                        </div>
                                      ))
                                    ) : null}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {isChatLoading && (
                    <div className="flex items-center gap-2 text-xs text-slate-400 p-3 bg-slate-950 border border-slate-850 rounded-2xl w-fit">
                      <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                      <span className="font-mono">
                        {language === "es"
                          ? `${provider === "cohere" ? "Cohere" : "Gemini"} está analizando la respuesta...`
                          : `${provider === "cohere" ? "Cohere" : "Gemini"} is analyzing response...`}
                      </span>
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </div>
              )}
            </div>

            {/* Prompting Technique Config Selector Panel */}
            <div className="px-4.5 py-2.5 bg-slate-950/80 border-t border-slate-850/80 flex items-center justify-between gap-2 text-[10px] font-mono select-none" id="prompt-technique-selector">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Brain className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                <span>{language === "es" ? "Técnica de Prompting:" : "Prompting Technique:"}</span>
              </div>
              <div className="flex gap-1 bg-slate-900 border border-slate-800 p-0.5 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPromptTechnique('standard')}
                  className={`px-2.5 py-1 rounded-lg font-sans text-[10px] font-bold transition-all cursor-pointer ${
                    promptTechnique === 'standard'
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                  id="prompt-tech-standard"
                >
                  Estándar
                </button>
                <button
                  type="button"
                  onClick={() => setPromptTechnique('cot')}
                  className={`px-2.5 py-1 rounded-lg font-sans text-[10px] font-bold transition-all cursor-pointer ${
                    promptTechnique === 'cot'
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                  id="prompt-tech-cot"
                  title="Chain of Thought - Pensamiento Paso a Paso de la IA"
                >
                  CoT
                </button>
                <button
                  type="button"
                  onClick={() => setPromptTechnique('cove')}
                  className={`px-2.5 py-1 rounded-lg font-sans text-[10px] font-bold transition-all cursor-pointer ${
                    promptTechnique === 'cove'
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                  id="prompt-tech-cove"
                  title="Chain of Verification - Autoverificación iterativa de la IA contra alucinaciones"
                >
                  CoVe
                </button>
              </div>
            </div>

            {/* Google Search Grounding Toggle Panel */}
            {provider === "gemini" && (
              <div className="px-4.5 py-2 border-t border-slate-850/60 bg-slate-950/50 flex items-center justify-between gap-2 text-[10px] font-mono select-none" id="google-search-grounding-toggle">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Globe className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>{language === "es" ? "Búsqueda en Google (Grounding):" : "Google Search (Grounding):"}</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={useSearchGrounding}
                    onChange={(e) => setUseSearchGrounding(e.target.checked)}
                    className="sr-only peer" 
                  />
                  <div className="w-7 h-4 bg-slate-850 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-500 peer-checked:after:bg-sky-400 after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-sky-950/40 border border-slate-850 peer-checked:border-sky-500/30"></div>
                  <span className="ml-2 text-[9px] font-bold text-slate-400 group-hover:text-slate-200 transition-colors uppercase tracking-wider">
                    {useSearchGrounding ? (language === "es" ? "Activado" : "Enabled") : (language === "es" ? "Desactivado" : "Disabled")}
                  </span>
                </label>
              </div>
            )}

            {/* Chat Input form */}
            <form onSubmit={handleSend} className="p-3 bg-slate-950/60 border-t border-slate-850 flex gap-2">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                disabled={isChatLoading}
                placeholder={
                  language === "es"
                    ? `Pregúntale a ${provider === "cohere" ? "Cohere" : "Gemini"} sobre este documento...`
                    : `Ask ${provider === "cohere" ? "Cohere" : "Gemini"} about this document...`
                }
                className="flex-1 bg-slate-950 border border-slate-800/80 focus:border-indigo-500 focus:bg-slate-900 rounded-xl px-3.5 py-2.5 text-xs outline-none transition-all disabled:opacity-60 text-slate-200 placeholder-slate-600"
                id="input-chat-query"
              />
              <button
                type="submit"
                disabled={!userInput.trim() || isChatLoading}
                className="bg-indigo-600 hover:bg-indigo-500 text-white p-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/10 disabled:opacity-50 disabled:hover:bg-indigo-600 flex items-center justify-center shrink-0 cursor-pointer"
                id="btn-send-chat-query"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
