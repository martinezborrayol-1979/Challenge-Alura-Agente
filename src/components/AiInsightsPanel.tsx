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
  Download
} from "lucide-react";
import ReactMarkdown from "react-markdown";

interface AiInsightsPanelProps {
  document: DocumentItem;
  chats: ChatMessage[];
  onSendMessage: (docId: string, messageText: string) => Promise<void>;
  isChatLoading: boolean;
  isAnalyzing: boolean;
  onGenerateExecutiveSummary: (docId: string) => Promise<void>;
  isGeneratingSummary: boolean;
}

export default function AiInsightsPanel({
  document,
  chats,
  onSendMessage,
  isChatLoading,
  isAnalyzing,
  onGenerateExecutiveSummary,
  isGeneratingSummary,
}: AiInsightsPanelProps) {
  const [activeTab, setActiveTab] = useState<"insights" | "summary" | "chat">("insights");
  const [userInput, setUserInput] = useState("");
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom of chat when new message arrives
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chats, isChatLoading, activeTab]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isChatLoading) return;
    onSendMessage(document.id, userInput.trim());
    setUserInput("");
  };

  const handleSuggestClick = (suggestion: string) => {
    if (isChatLoading) return;
    onSendMessage(document.id, suggestion);
  };

  const handleExportMarkdown = () => {
    if (!document) return;

    let md = `# Informe de Inteligencia Documental: ${document.title}\n\n`;
    md += `*   **Fecha de Creación:** ${new Date(document.createdAt).toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}\n`;
    md += `*   **Categoría:** ${document.category}\n`;
    
    if (document.analysis) {
      md += `*   **Idioma Detectado:** ${document.analysis.language || "No especificado"}\n`;
      md += `*   **Nivel de Riesgo:** ${document.analysis.riskLevel || "No evaluado"}\n`;
    }
    md += `\n---\n\n`;

    if (document.executiveSummary) {
      md += `## 📌 Resumen Ejecutivo de Negocios\n\n`;
      md += `${document.executiveSummary}\n\n`;
      md += `---\n\n`;
    }

    if (document.analysis) {
      md += `## 🧠 Análisis y Resumen General de AI\n\n`;
      md += `${document.analysis.summary || "No hay un resumen disponible."}\n\n`;

      if (document.analysis.metadata && document.analysis.metadata.length > 0) {
        md += `## 📊 Metadatos Estructurales Extraídos\n\n`;
        md += `| Campo Clave | Valor Encontrado |\n`;
        md += `| :--- | :--- |\n`;
        document.analysis.metadata.forEach((item) => {
          md += `| **${item.key}** | ${item.value} |\n`;
        });
        md += `\n`;
      }

      if (document.analysis.suggestedActions && document.analysis.suggestedActions.length > 0) {
        md += `## 🎯 Acciones de Negocio Sugeridas\n\n`;
        document.analysis.suggestedActions.forEach((action, idx) => {
          md += `${idx + 1}. ${action}\n`;
        });
        md += `\n`;
      }
    }

    md += `---\n`;
    md += `*Informe exportado automáticamente desde DocuMind AI utilizando Gemini 3.5 Flash.*`;

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    
    const safeTitle = document.title
      .toLowerCase()
      .replace(/[^a-z0-9ñáéíóúü]/gi, "_")
      .replace(/_+/g, "_")
      .substring(0, 50);
    link.setAttribute("download", `informe_ai_${safeTitle || "documento"}.md`);
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getSuggestedQueries = (category: string) => {
    switch (category) {
      case "Financiero":
        return [
          "¿Cuál es el monto total neto a pagar?",
          "¿Cuál es la fecha de vencimiento y términos?",
          "¿Cuáles son los datos bancarios para transferencia?"
        ];
      case "Legal":
        return [
          "¿Cuál es el límite de responsabilidad establecido?",
          "¿Bajo qué ley aplicable se rige el contrato?",
          "¿Cuáles son las obligaciones del Prestador?"
        ];
      case "Técnico":
        return [
          "¿Qué parámetros recibe el endpoint /v2/documents/extract?",
          "¿Cuáles son los límites de uso (rate limits) aplicables?",
          "¿Cómo se realiza la autenticación de solicitudes?"
        ];
      case "Recursos Humanos":
        return [
          "¿Cuáles son los días obligatorios de asistencia presencial?",
          "¿Cuál es el monto de estipendio remoto y para qué sirve?",
          "¿Cuál es la política de retorno de equipamiento?"
        ];
      default:
        return [
          "Resume los puntos clave de este documento.",
          "¿Hay algún riesgo o fecha límite que deba vigilar?",
          "Extrae los nombres de personas u organizaciones mencionadas."
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
        <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 font-sans">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block mb-0.5">Riesgo Alto</span>
            {riskText}
          </div>
        </div>
      );
    } else if (isMedium) {
      return (
        <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 font-sans">
          <BadgeAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block mb-0.5">Riesgo Moderado</span>
            {riskText}
          </div>
        </div>
      );
    } else {
      return (
        <div className="flex items-start gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-sans">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block mb-0.5">Riesgo Bajo</span>
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
          <span className="truncate">Análisis AI</span>
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
          <span className="truncate">Resumen Ejecutivo</span>
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
          <span className="truncate">Preguntar</span>
          {chats.length > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] bg-white text-indigo-700 rounded-full leading-none font-bold shrink-0">
              {chats.length}
            </span>
          )}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto relative bg-slate-900">
        {isAnalyzing ? (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-10">
            <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mb-4" />
            <h3 className="text-sm font-bold text-slate-100 mb-1 font-sans">
              Procesando Inteligencia Semántica
            </h3>
            <p className="text-xs text-slate-400 font-mono max-w-xs leading-relaxed animate-pulse">
              Extrayendo entidades clave con Gemini 3.5 Flash...
            </p>
          </div>
        ) : null}

        {isGeneratingSummary && activeTab !== "summary" ? (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-10">
            <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mb-4" />
            <h3 className="text-sm font-bold text-slate-100 mb-1 font-sans animate-pulse">
              Destilando Resumen Ejecutivo
            </h3>
            <p className="text-xs text-slate-400 font-mono max-w-xs leading-relaxed">
              Sintetizando datos clave y recomendaciones con Gemini 3.5 Flash...
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
                  Sintetizando resumen de negocios con Gemini AI...
                </div>
              </div>
            ) : document.executiveSummary ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse animate-duration-1000 shrink-0" />
                    <span className="text-xs font-bold tracking-wider text-indigo-400 uppercase font-mono">
                      Resumen Ejecutivo de Negocios
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportMarkdown}
                      className="text-[10px] bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/40 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition-all cursor-pointer font-bold font-mono uppercase tracking-wider flex items-center gap-1.5 shrink-0"
                      title="Exportar informe a Markdown (.md)"
                      id="btn-export-summary-md"
                    >
                      <Download className="w-3.5 h-3.5 text-indigo-400" />
                      Exportar (.md)
                    </button>
                    <button
                      onClick={() => onGenerateExecutiveSummary(document.id)}
                      disabled={isGeneratingSummary}
                      className="text-[10px] bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/40 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition-all cursor-pointer font-bold font-mono uppercase tracking-wider flex items-center gap-1 disabled:opacity-50"
                    >
                      <TrendingUp className="w-3 h-3 text-indigo-400" />
                      Regenerar
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
                  ⚡ Generado en tiempo real con Gemini 3.5 Flash
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-12 max-w-md mx-auto">
                <div className="p-4 bg-slate-950 border border-slate-850 rounded-full shadow-md mb-4 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-indigo-400 animate-pulse" />
                </div>
                <h3 className="text-sm font-bold text-slate-100 mb-2">
                  ¿Necesitas un Resumen Ejecutivo?
                </h3>
                <p className="text-xs text-slate-400 max-w-xs leading-relaxed mb-6 font-sans">
                  Sintetiza la información crítica de este documento. Gemini analizará, destilará y estructurará el contenido en una sinopsis gerencial con indicadores clave y recomendaciones.
                </p>
                <button
                  onClick={() => onGenerateExecutiveSummary(document.id)}
                  disabled={isGeneratingSummary}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-700/50 text-white font-bold text-xs py-3 px-6 rounded-xl shadow-lg shadow-indigo-600/10 transition-all flex items-center justify-center gap-2 cursor-pointer group"
                >
                  <TrendingUp className="w-4 h-4 text-white group-hover:-translate-y-0.5 transition-transform" />
                  Generar Resumen Ejecutivo
                </button>
              </div>
            )}
          </div>
        ) : activeTab === "insights" ? (
          <div className="p-6 space-y-6 font-sans">
            {/* Category and Summary */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/40 pb-2.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                  <span className="text-xs font-bold tracking-wider text-indigo-400 uppercase font-mono">
                    Resumen Ejecutivo AI
                  </span>
                </div>
                {(analysis || document.executiveSummary) && (
                  <button
                    onClick={handleExportMarkdown}
                    className="text-[10px] bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/40 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition-all cursor-pointer font-bold font-mono uppercase tracking-wider flex items-center gap-1.5 shrink-0"
                    title="Exportar informe a Markdown (.md)"
                    id="btn-export-insights-md"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-400" />
                    Exportar (.md)
                  </button>
                )}
              </div>
              <p className="text-sm text-slate-300 leading-relaxed bg-slate-950 p-4 rounded-2xl border border-slate-850">
                {analysis?.summary || "No hay análisis disponible para este documento. Haz clic en 'Reanalizar con AI' para generarlo de forma inteligente."}
              </p>
            </div>

            {/* Language Banner */}
            {analysis?.language && (
              <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950/60 px-3 py-2 rounded-xl border border-slate-850">
                <Languages className="w-3.5 h-3.5 text-indigo-400" />
                <span>Idioma Detectado: <strong className="text-slate-200 font-bold">{analysis.language}</strong></span>
              </div>
            )}

            {/* Extraction Table */}
            {analysis && analysis.metadata && analysis.metadata.length > 0 && (
              <div className="space-y-3">
                <span className="text-xs font-bold tracking-wider text-indigo-400 uppercase font-mono block">
                  Metadatos Estructurales Extraídos
                </span>
                <div className="border border-slate-850 rounded-2xl overflow-hidden bg-slate-950/40 shadow-sm">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-950 border-b border-slate-850">
                        <th className="px-4 py-2.5 font-bold text-slate-300 font-mono w-1/3">Campo Clave</th>
                        <th className="px-4 py-2.5 font-bold text-slate-300">Valor Encontrado</th>
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
                  Acciones de Negocio Sugeridas
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
                  Auditoría de Cumplimiento & Riesgo
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
                    Asistente Contextual DocuMind
                  </h4>
                  <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed font-sans mb-4">
                    Haz preguntas específicas sobre cláusulas, montos o detalles de este documento. Gemini tiene acceso inmediato a su contenido.
                  </p>

                  {/* Suggestion Quick Chips */}
                  <div className="w-full space-y-2 mt-2">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest font-mono block text-left px-1">
                      Preguntas Sugeridas
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
                <div className="space-y-3.5">
                  {chats.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        msg.role === "user" ? "items-end" : "items-start"
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-xl p-3 text-xs leading-relaxed ${
                          msg.role === "user"
                            ? "bg-indigo-600 text-white shadow-sm font-medium"
                            : "bg-slate-950 text-slate-200 border border-slate-850 shadow-xs"
                        }`}
                      >
                        <span className="whitespace-pre-wrap font-sans">{msg.content}</span>
                      </div>
                      <span className="text-[9px] text-slate-500 mt-1 px-1 font-mono">
                        {msg.timestamp}
                      </span>
                    </div>
                  ))}

                  {isChatLoading && (
                    <div className="flex items-center gap-2 text-xs text-slate-400 p-2.5 bg-slate-950/60 border border-slate-850 rounded-xl w-fit">
                      <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                      <span className="font-mono">Gemini está analizando la respuesta...</span>
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </div>
              )}
            </div>

            {/* Chat Input form */}
            <form onSubmit={handleSend} className="p-3 bg-slate-950/60 border-t border-slate-850 flex gap-2">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                disabled={isChatLoading}
                placeholder="Pregúntale a Gemini sobre este documento..."
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
