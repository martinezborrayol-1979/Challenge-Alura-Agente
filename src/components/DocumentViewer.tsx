import React, { useState, useEffect } from "react";
import { DocumentItem } from "../types";
import { FileText, Edit2, Check, X, RefreshCw, Calendar, Tag, Maximize2, Minimize2, BookOpen, Trash2 } from "lucide-react";

// Helper functions to approximate syllables and calculate Flesch-Kincaid readability
function countWordSyllables(word: string): number {
  word = word.toLowerCase().trim().replace(/[^a-záéíóúüñ]/g, "");
  if (!word || word.length <= 1) return 1;
  if (word.length <= 3) return 1;

  // Count vowel groups as syllable indicators (extremely robust for Spanish and very decent for English)
  const vowels = /[aeiouyáéíóúü]+/g;
  const matches = word.match(vowels);
  let count = matches ? matches.length : 1;

  // Basic English adjust for silent 'e' at the end
  if (word.endsWith('e') && !word.endsWith('le')) {
    count--;
  }
  return Math.max(1, count);
}

function calculateFleschKincaid(text: string) {
  if (!text || text.trim().length === 0) {
    return { 
      score: 0, 
      gradeLevel: 0, 
      label: "Sin contenido", 
      colorClass: "bg-slate-950/60 text-slate-400 border-slate-850 hover:bg-slate-900/35",
      totalWords: 0,
      totalSentences: 0,
      totalSyllables: 0
    };
  }

  // Count sentences: divide by standard sentence end markers
  const sentences = text.split(/[.!?]+(?:\s+|$)/).filter(s => s.trim().length > 0);
  const totalSentences = Math.max(1, sentences.length);

  // Count words: extract non-empty word segments
  const words = text.toLowerCase().match(/[a-záéíóúüñ0-9]+/g) || [];
  const totalWords = Math.max(1, words.length);

  // Syllables count
  let totalSyllables = 0;
  for (const word of words) {
    totalSyllables += countWordSyllables(word);
  }

  // Calculate standard Flesch Reading Ease score
  // FRE = 206.835 - (1.015 * (totalWords / totalSentences)) - (84.6 * (totalSyllables / totalWords))
  const rawScore = 206.835 - 1.015 * (totalWords / totalSentences) - 84.6 * (totalSyllables / totalWords);
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  // Calculate Grade Level
  // GL = 0.39 * (totalWords / totalSentences) + 11.8 * (totalSyllables / totalWords) - 15.59
  const rawGrade = 0.39 * (totalWords / totalSentences) + 11.8 * (totalSyllables / totalWords) - 15.59;
  const gradeLevel = Math.max(1, Math.round(rawGrade));

  // Determine category and styling
  let label = "Complejo";
  let colorClass = "bg-rose-950/60 text-rose-400 border-rose-900/60 hover:bg-rose-900/20 hover:border-rose-500/30";

  if (score >= 90) {
    label = "Muy Sencillo";
    colorClass = "bg-emerald-950/60 text-emerald-400 border-emerald-900/60 hover:bg-emerald-900/20 hover:border-emerald-500/30";
  } else if (score >= 70) {
    label = "Sencillo";
    colorClass = "bg-teal-950/60 text-teal-400 border-teal-900/60 hover:bg-teal-900/20 hover:border-teal-500/30";
  } else if (score >= 50) {
    label = "Moderado";
    colorClass = "bg-amber-950/60 text-amber-400 border-amber-900/60 hover:bg-amber-900/20 hover:border-amber-500/30";
  } else if (score >= 30) {
    label = "Complejo";
    colorClass = "bg-orange-950/60 text-orange-400 border-orange-900/60 hover:bg-orange-900/20 hover:border-orange-500/30";
  } else {
    label = "Muy Técnico";
    colorClass = "bg-red-950/60 text-red-400 border-red-900/60 hover:bg-red-900/20 hover:border-red-500/30";
  }

  return {
    score,
    gradeLevel,
    label,
    colorClass,
    totalWords,
    totalSentences,
    totalSyllables,
  };
}

interface DocumentViewerProps {
  document: DocumentItem;
  onUpdateContent: (id: string, newContent: string) => void;
  onTriggerReanalyze: (id: string) => Promise<void>;
  isAnalyzing: boolean;
  isFocusMode: boolean;
  onToggleFocusMode: () => void;
  onDeleteDocument: (id: string) => void;
}

export default function DocumentViewer({
  document,
  onUpdateContent,
  onTriggerReanalyze,
  isAnalyzing,
  isFocusMode,
  onToggleFocusMode,
  onDeleteDocument,
}: DocumentViewerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(document.content);

  useEffect(() => {
    setEditedContent(document.content);
    setIsEditing(false);
  }, [document]);

  const readability = calculateFleschKincaid(isEditing ? editedContent : document.content);

  const handleSave = () => {
    onUpdateContent(document.id, editedContent);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedContent(document.content);
    setIsEditing(false);
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "Financiero":
        return "bg-emerald-950/60 text-emerald-400 border-emerald-900/60";
      case "Legal":
        return "bg-indigo-950/60 text-indigo-400 border-indigo-900/60";
      case "Técnico":
        return "bg-cyan-950/60 text-cyan-400 border-cyan-900/60";
      case "Recursos Humanos":
        return "bg-amber-950/60 text-amber-400 border-amber-900/60";
      default:
        return "bg-slate-950/60 text-slate-400 border-slate-850";
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden" id="document-viewer-container">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-950 border border-slate-800 rounded-xl">
            <FileText className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 font-sans max-w-xs md:max-w-md truncate" id="document-title">
              {document.title}
            </h2>
            <div className="flex items-center gap-2.5 mt-1 text-xs text-slate-400 font-sans flex-wrap">
              <span className="flex items-center gap-1 shrink-0">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(document.createdAt).toLocaleDateString("es-ES", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <span className={`px-2 py-0.5 border rounded-full text-[10px] font-semibold shrink-0 ${getCategoryColor(document.category)}`}>
                {document.category}
              </span>
              
              {/* Readability Score Metric Chip with Hover Tooltip */}
              <div 
                className={`flex items-center gap-1.5 px-2 py-0.5 border rounded-full text-[10px] font-semibold transition-all duration-300 select-none group relative cursor-help shrink-0 ${readability.colorClass}`}
                id="metric-readability-chip"
              >
                <BookOpen className="w-3 h-3 text-current animate-pulse shrink-0" />
                <span>Legibilidad: {readability.score} ({readability.label})</span>

                {/* Interactive Tooltip showing detailed metrics */}
                <div className="absolute top-full left-0 mt-2.5 hidden group-hover:flex flex-col gap-2 p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-[10px] text-slate-300 font-mono w-52 shadow-2xl z-30 leading-normal pointer-events-none animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="text-indigo-400 font-bold border-b border-slate-850 pb-1.5 flex justify-between items-center">
                    <span>MÉTRICAS LECTORAS</span>
                    <span className="text-[9px] bg-indigo-950 px-1.5 py-0.5 rounded text-indigo-300 font-semibold uppercase font-sans">Flesch</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Índice Flesch:</span>
                    <span className="font-bold text-slate-100">{readability.score}/100</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Nivel Escolar:</span>
                    <span className="font-bold text-slate-100">Grado {readability.gradeLevel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Palabras:</span>
                    <span className="font-bold text-slate-100">{readability.totalWords}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Frases:</span>
                    <span className="font-bold text-slate-100">{readability.totalSentences}</span>
                  </div>
                  <div className="text-[9px] text-slate-500 italic mt-0.5 pt-1.5 border-t border-slate-900 leading-tight">
                    Promedio: {readability.totalWords > 0 ? (readability.totalSyllables / readability.totalWords).toFixed(1) : 0} sílabas/palabra. {isEditing ? "Recalculando..." : "Tiempo real"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Focus Mode toggle (available in both reading and editing modes) */}
          <button
            onClick={onToggleFocusMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
              isFocusMode
                ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-600/35"
                : "bg-slate-950 border-slate-800/85 text-slate-300 hover:bg-slate-900"
            }`}
            title={isFocusMode ? "Desactivar modo enfoque" : "Activar modo enfoque (ocultar paneles laterales)"}
            id="btn-toggle-focus"
          >
            {isFocusMode ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="hidden md:inline font-sans">Vista Normal</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="hidden md:inline font-sans">Modo Enfoque</span>
              </>
            )}
          </button>

          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors shadow-sm cursor-pointer"
                title="Guardar cambios locales"
                id="btn-save-doc-edits"
              >
                <Check className="w-3.5 h-3.5" />
                Guardar
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-950 border border-slate-800 hover:bg-slate-900 rounded-xl transition-colors cursor-pointer"
                title="Cancelar edición"
                id="btn-cancel-doc-edits"
              >
                <X className="w-3.5 h-3.5" />
                Cancelar
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onDeleteDocument(document.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-400 bg-slate-950 border border-slate-800/80 hover:bg-rose-950/20 hover:border-rose-500/35 rounded-xl transition-colors cursor-pointer"
                title="Eliminar este documento de la bóveda local"
                id="btn-delete-doc"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Eliminar</span>
              </button>

              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-950 border border-slate-800 hover:bg-slate-900 rounded-xl transition-colors shadow-sm cursor-pointer"
                title="Editar texto del documento"
                id="btn-edit-doc"
              >
                <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                Editar Texto
              </button>

              <button
                onClick={() => onTriggerReanalyze(document.id)}
                disabled={isAnalyzing}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-950 disabled:text-slate-500 rounded-xl transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                title="Volver a analizar con Gemini"
                id="btn-reanalyze-doc"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? "animate-spin" : ""}`} />
                {isAnalyzing ? "Analizando..." : "Reanalizar con AI"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Workspace Paper Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-slate-950/40 relative">
        <div className="max-w-2xl mx-auto bg-slate-950 min-h-[500px] shadow-lg border border-slate-800/80 rounded-2xl p-6 md:p-8 relative overflow-hidden transition-all duration-300">
          
          {/* Paper decorative corner watermark */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-500/5 to-transparent pointer-events-none" />
          
          {isEditing ? (
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full h-[450px] text-sm text-slate-200 font-mono p-4 border border-indigo-500/30 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl outline-none resize-none leading-relaxed bg-slate-900/60"
              placeholder="Escribe o pega el contenido del documento aquí..."
              id="doc-edit-textarea"
            />
          ) : (
            <div className="prose prose-invert max-w-none text-slate-300 font-sans leading-relaxed whitespace-pre-wrap text-sm">
              {document.content ? (
                document.content
              ) : (
                <div className="text-center py-20 text-slate-500 font-mono">
                  [Este documento está vacío. Añade contenido en modo Edición]
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
