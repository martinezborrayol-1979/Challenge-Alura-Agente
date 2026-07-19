import React, { useState } from "react";
import { DocumentItem } from "../types";
import { ArrowLeftRight, Sparkles, Loader2, AlertCircle, Check, FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useLanguage } from "../LanguageContext";

interface ComparePanelProps {
  documents: DocumentItem[];
  provider?: "gemini" | "cohere";
  onCancel: () => void;
}

export default function ComparePanel({ documents, provider = "gemini", onCancel }: ComparePanelProps) {
  const { language } = useLanguage();
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const handleToggleSelect = (id: string) => {
    setSelectedDocIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((docId) => docId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleRunComparison = async () => {
    if (selectedDocIds.length < 2) {
      setErrorMsg(
        language === "es"
          ? "Selecciona al menos dos documentos para realizar la comparación."
          : "Please select at least two documents to perform the comparison."
      );
      return;
    }

    setErrorMsg("");
    setIsComparing(true);
    setComparisonResult(null);

    const docsToCompare = documents
      .filter((doc) => selectedDocIds.includes(doc.id))
      .map((doc) => ({
        title: doc.title,
        text: doc.content,
      }));

    try {
      const response = await fetch("/api/documents/compare", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ documents: docsToCompare, provider }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "No se pudo completar la comparación.");
      }

      const data = await response.json();
      setComparisonResult(data.text);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        language === "es"
          ? `Error en la comparación con AI: ${err.message || "No se pudo conectar con el servidor."}`
          : `Error in AI comparison: ${err.message || "Could not connect to the server."}`
      );
    } finally {
      setIsComparing(false);
    }
  };

  const selectedDocs = documents.filter((doc) => selectedDocIds.includes(doc.id));

  return (
    <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden p-6 md:p-8 font-sans" id="compare-panel-container">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-indigo-400" />
            {language === "es" ? "Comparación Cruzada con AI" : "Cross-Document AI Comparison"}
          </h2>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            {language === "es"
              ? `Selecciona dos o más documentos de tu repositorio. ${provider === "cohere" ? "Cohere Command" : "Gemini"} realizará un análisis comparativo identificando divergencias, cláusulas en conflicto, discrepancias de montos y recomendaciones operativas.`
              : `Select two or more documents from your repository. ${provider === "cohere" ? "Cohere Command" : "Gemini"} will perform a comparative analysis identifying discrepancies, conflicting clauses, payment term variations, and operational insights.`}
          </p>
        </div>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-100 bg-slate-950 border border-slate-800 rounded-xl hover:bg-slate-900 transition-all cursor-pointer"
        >
          {language === "es" ? "Cerrar" : "Close"}
        </button>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-red-950/40 border border-red-900/60 rounded-xl flex items-start gap-2.5 text-xs text-red-300 mb-6">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Comparison results */}
      {comparisonResult ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-slate-950 border border-slate-800/80 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-950 border border-indigo-900/40 rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest font-mono">
                  {language === "es"
                    ? `Informe AI Generado (${provider === "cohere" ? "Cohere" : "Gemini"})`
                    : `AI Report Generated (${provider === "cohere" ? "Cohere" : "Gemini"})`}
                </span>
                <h3 className="text-xs font-bold text-slate-200 font-sans">
                  {language === "es"
                    ? `Comparación de ${selectedDocs.length} documentos`
                    : `Comparison of ${selectedDocs.length} documents`}
                </h3>
              </div>
            </div>
            <button
              onClick={() => {
                setComparisonResult(null);
                setSelectedDocIds([]);
              }}
              className="px-3.5 py-1.5 text-xs font-bold text-indigo-400 hover:text-white bg-slate-900 hover:bg-indigo-600 border border-slate-800 rounded-xl transition-all cursor-pointer shadow-sm"
            >
              {language === "es" ? "Nueva Comparación" : "New Comparison"}
            </button>
          </div>

          {/* Styled markdown output */}
          <div className="border border-slate-800/80 rounded-2xl p-6 md:p-8 bg-slate-950/60 max-h-[600px] overflow-y-auto shadow-inner">
            <div className="prose prose-invert prose-sm max-w-none text-slate-300 font-sans leading-relaxed">
              <div className="markdown-body">
                <ReactMarkdown>{comparisonResult}</ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      ) : isComparing ? (
        <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
          <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mb-6" />
          <h3 className="text-base font-bold text-slate-100 mb-2">
            {language === "es" ? "Generando Matriz Comparativa Cruzada" : "Generating Cross-Comparative Matrix"}
          </h3>
          <p className="text-sm text-slate-300 mb-2 font-medium animate-pulse">
            {language === "es" ? "Sintetizando diferencias y alineaciones..." : "Synthesizing differences and alignments..."}
          </p>
          <span className="text-[10px] font-bold text-slate-500 font-mono uppercase tracking-widest">
            {language === "es"
              ? `${provider === "cohere" ? "Cohere Command" : "Gemini 3.5 Flash"} está procesando los documentos`
              : `${provider === "cohere" ? "Cohere Command" : "Gemini 3.5 Flash"} is processing the documents`}
          </span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Document selection grid */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-indigo-400 tracking-widest uppercase font-mono block">
              {language === "es" ? "1. Selecciona los documentos (Mínimo 2)" : "1. Select the documents (Minimum 2)"}
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {documents.map((doc) => {
                const isChecked = selectedDocIds.includes(doc.id);
                return (
                  <div
                    key={doc.id}
                    onClick={() => handleToggleSelect(doc.id)}
                    className={`flex items-start gap-3 p-4 border rounded-2xl cursor-pointer transition-all ${
                      isChecked
                        ? "border-indigo-500 bg-indigo-950/20 shadow-md shadow-indigo-950/40"
                        : "border-slate-800 bg-slate-950/40 hover:bg-slate-950/80"
                    }`}
                  >
                    <div className="pt-0.5">
                      <div className={`w-4 py-[3px] h-4 border rounded flex items-center justify-center transition-all ${
                        isChecked 
                          ? "bg-indigo-600 border-indigo-600 text-white" 
                          : "border-slate-700 bg-slate-900"
                      }`}>
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <h4 className="text-xs font-bold text-slate-200 truncate">
                          {doc.title}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] text-slate-500 font-mono">
                          {language === "es"
                            ? doc.category === "Financiero" ? "Financiero" : doc.category === "Legal" ? "Legal" : doc.category === "Técnico" ? "Técnico" : doc.category === "Recursos Humanos" ? "Recursos Humanos" : doc.category
                            : doc.category === "Financiero" ? "Financial" : doc.category === "Legal" ? "Legal" : doc.category === "Técnico" ? "Technical" : doc.category === "Recursos Humanos" ? "Human Resources" : doc.category}
                        </span>
                        <span className="text-[9px] text-slate-500 font-sans">
                          •
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(doc.createdAt).toLocaleDateString(language === "es" ? "es-ES" : "en-US")}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom triggering actions */}
          <div className="flex items-center justify-between border-t border-slate-800/80 pt-4">
            <div className="text-xs text-slate-400">
              {selectedDocIds.length === 0 ? (
                language === "es" ? "Ningún documento seleccionado" : "No documents selected"
              ) : selectedDocIds.length === 1 ? (
                language === "es" ? "Selecciona 1 documento más" : "Select 1 more document"
              ) : (
                <span className="text-indigo-400 font-bold">
                  {language === "es"
                    ? `${selectedDocIds.length} documentos seleccionados listos para comparar`
                    : `${selectedDocIds.length} documents selected, ready to compare`}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-100 bg-slate-950 border border-slate-800 rounded-xl hover:bg-slate-900 transition-all cursor-pointer"
              >
                {language === "es" ? "Cancelar" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={handleRunComparison}
                disabled={selectedDocIds.length < 2}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-950 disabled:text-slate-500 rounded-xl transition-all shadow-md shadow-indigo-600/10 flex items-center gap-1.5 cursor-pointer"
                id="btn-trigger-comparison"
              >
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                {language === "es"
                  ? `Comparar con ${provider === "cohere" ? "Cohere" : "Gemini AI"}`
                  : `Compare with ${provider === "cohere" ? "Cohere" : "Gemini AI"}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
