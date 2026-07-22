import React, { useState, useEffect, useRef, useMemo } from "react";
import { DocumentItem } from "../types";
import { FileText, Edit2, Check, X, RefreshCw, Calendar, Tag, Maximize2, Minimize2, BookOpen, Trash2, Clock, History, RotateCcw, GitCommit, ArrowLeft, Download, GitCompare, Split, ChevronDown, ChevronRight, Type, Search } from "lucide-react";
import { useLanguage } from "../LanguageContext";
import { computeLineDiff, computeWordDiff, DiffLine, WordToken } from "../utils/diff";

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

function calculateFleschKincaid(text: string, language: "es" | "en" = "es") {
  if (!text || text.trim().length === 0) {
    return { 
      score: 0, 
      gradeLevel: 0, 
      label: language === "es" ? "Sin contenido" : "No content", 
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
  let label = language === "es" ? "Complejo" : "Difficult";
  let colorClass = "bg-rose-950/60 text-rose-400 border-rose-900/60 hover:bg-rose-900/20 hover:border-rose-500/30";

  if (score >= 90) {
    label = language === "es" ? "Muy Sencillo" : "Very Easy";
    colorClass = "bg-emerald-950/60 text-emerald-400 border-emerald-900/60 hover:bg-emerald-900/20 hover:border-emerald-500/30";
  } else if (score >= 70) {
    label = language === "es" ? "Sencillo" : "Easy";
    colorClass = "bg-teal-950/60 text-teal-400 border-teal-900/60 hover:bg-teal-900/20 hover:border-teal-500/30";
  } else if (score >= 50) {
    label = language === "es" ? "Estándar" : "Standard";
    colorClass = "bg-amber-950/60 text-amber-400 border-amber-900/60 hover:bg-amber-900/20 hover:border-amber-500/30";
  } else if (score >= 30) {
    label = language === "es" ? "Complejo" : "Complex";
    colorClass = "bg-orange-950/60 text-orange-400 border-orange-900/60 hover:bg-orange-900/20 hover:border-orange-500/30";
  } else {
    label = language === "es" ? "Muy Técnico" : "Very Technical";
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

function highlightSearchText(text: string, query: string) {
  if (!query || !query.trim()) return text;

  const trimmedQuery = query.trim();
  const escapedQuery = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escapedQuery})`, "gi");
  const parts = text.split(regex);

  if (parts.length <= 1) return text;

  return parts.map((part, idx) => {
    if (part.toLowerCase() === trimmedQuery.toLowerCase()) {
      return (
        <mark
          key={idx}
          className="bg-amber-400/35 text-amber-100 ring-1 ring-amber-400/60 border-b-2 border-amber-400 px-1 py-0.5 rounded font-semibold transition-all shadow-[0_0_12px_rgba(245,158,11,0.3)] mx-0.5"
        >
          {part}
        </mark>
      );
    }
    return part;
  });
}

interface DocumentViewerProps {
  document: DocumentItem;
  onUpdateContent: (id: string, newContent: string, changeSummary?: string, updatedTags?: string[]) => void;
  onTriggerReanalyze: (id: string) => Promise<void>;
  isAnalyzing: boolean;
  isFocusMode: boolean;
  onToggleFocusMode: () => void;
  onDeleteDocument: (id: string) => void;
  onRevertToVersion: (docId: string, versionId: string) => void;
  userRole?: 'admin' | 'viewer';
  provider?: 'gemini' | 'cohere';
  searchQuery?: string;
}

export default function DocumentViewer({
  document,
  onUpdateContent,
  onTriggerReanalyze,
  isAnalyzing,
  isFocusMode,
  onToggleFocusMode,
  onDeleteDocument,
  onRevertToVersion,
  userRole = "admin",
  provider = "gemini",
  searchQuery = "",
}: DocumentViewerProps) {
  const { language, t } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(document.content);
  const [showHistory, setShowHistory] = useState(false);
  const [changeSummary, setChangeSummary] = useState("");
  const [selectedPreviewVersionId, setSelectedPreviewVersionId] = useState<string | null>(null);
  const [scrollPercent, setScrollPercent] = useState(0);
  const [editedTags, setEditedTags] = useState<string[]>(document.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [compareTarget, setCompareTarget] = useState<"live" | "previous">("live");
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEditedContent(document.content);
    setEditedTags(document.tags || []);
    setTagInput("");
    setIsEditing(false);
    setSelectedPreviewVersionId(null);
    setIsCompareMode(false);
    setCompareTarget("live");
    setShowDownloadDropdown(false);
    setScrollPercent(0);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
      setTimeout(() => {
        if (scrollContainerRef.current) {
          const { scrollHeight, clientHeight } = scrollContainerRef.current;
          if (scrollHeight - clientHeight <= 0) {
            setScrollPercent(100);
          } else {
            setScrollPercent(0);
          }
        }
      }, 50);
    }
  }, [document]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollTop = target.scrollTop;
    const scrollHeight = target.scrollHeight;
    const clientHeight = target.clientHeight;
    const totalScrollable = scrollHeight - clientHeight;
    
    if (totalScrollable <= 0) {
      setScrollPercent(100);
    } else {
      const percentage = Math.min(100, Math.round((scrollTop / totalScrollable) * 100));
      setScrollPercent(percentage);
    }
  };

  const renderDiffLine = (line: DiffLine, side: 'left' | 'right', oppositeLine?: DiffLine) => {
    if (line.type === 'empty') {
      return (
        <div className="flex items-stretch min-h-[1.5rem] bg-slate-950/20 select-none text-[11px] font-mono leading-relaxed border-b border-slate-900/10">
          <div className="w-10 text-slate-700 text-right pr-2 select-none border-r border-slate-900 bg-slate-950/40" />
          <div className="flex-1 px-3 text-slate-800/20 italic select-none">~</div>
        </div>
      );
    }

    const isRemoved = line.type === 'removed';
    const isAdded = line.type === 'added';
    
    // Base classes for the line
    let lineClass = "flex items-stretch min-h-[1.5rem] text-[11px] font-mono leading-relaxed border-b border-slate-900/15 transition-all ";
    if (isRemoved) {
      lineClass += "bg-rose-950/25 text-rose-200 border-l-2 border-l-rose-500/80";
    } else if (isAdded) {
      lineClass += "bg-emerald-950/15 text-emerald-200 border-l-2 border-l-emerald-500/80";
    } else {
      lineClass += "text-slate-300 hover:bg-slate-900/40";
    }

    // Calculate inner word diffs if we are pairing a removed line on the left with an added line on the right!
    let contentElement = <span className="whitespace-pre-wrap">{line.content}</span>;

    if (isRemoved && oppositeLine && oppositeLine.type === 'added') {
      const { left } = computeWordDiff(line.content, oppositeLine.content);
      contentElement = (
        <span className="whitespace-pre-wrap">
          {left.map((token, idx) => (
            <span 
              key={idx} 
              className={token.type === 'removed' ? 'bg-rose-900/60 text-rose-100 font-semibold px-0.5 rounded' : ''}
            >
              {token.text}
            </span>
          ))}
        </span>
      );
    } else if (isAdded && oppositeLine && oppositeLine.type === 'removed') {
      const { right } = computeWordDiff(oppositeLine.content, line.content);
      contentElement = (
        <span className="whitespace-pre-wrap">
          {right.map((token, idx) => (
            <span 
              key={idx} 
              className={token.type === 'added' ? 'bg-emerald-900/60 text-emerald-100 font-semibold px-0.5 rounded' : ''}
            >
              {token.text}
            </span>
          ))}
        </span>
      );
    }

    return (
      <div className={lineClass}>
        <div className="w-10 text-slate-600 text-right pr-2 select-none border-r border-slate-900 bg-slate-950/35 font-semibold text-[10px] flex items-center justify-end">
          {line.lineNumber}
        </div>
        <div className="flex-1 px-3 py-0.5 whitespace-pre-wrap break-all flex items-center">
          {contentElement}
        </div>
      </div>
    );
  };

  const isPreviewing = selectedPreviewVersionId !== null;
  const previewVersion = document.versions?.find((v) => v.id === selectedPreviewVersionId);

  // Find previous version in history relative to the selected preview version
  const previousVersion = React.useMemo(() => {
    if (!document.versions || !selectedPreviewVersionId) return null;
    const idx = document.versions.findIndex((v) => v.id === selectedPreviewVersionId);
    if (idx === -1 || idx === document.versions.length - 1) return null;
    return document.versions[idx + 1];
  }, [document.versions, selectedPreviewVersionId]);

  // Compute the lines for side-by-side diff
  const diffData = React.useMemo(() => {
    if (!isPreviewing || !previewVersion) return { left: [], right: [] };

    let oldText = "";
    let newText = "";

    if (compareTarget === "previous" && previousVersion) {
      oldText = previousVersion.content;
      newText = previewVersion.content;
    } else {
      // Default fallback or compare with current live version
      oldText = previewVersion.content;
      newText = document.content;
    }

    return computeLineDiff(oldText, newText);
  }, [isPreviewing, previewVersion, previousVersion, compareTarget, document.content]);

  const contentToDisplay = isPreviewing && previewVersion ? previewVersion.content : (isEditing ? editedContent : document.content);
  const activeText = isEditing ? editedContent : contentToDisplay;

  const wordCount = activeText.trim() ? activeText.trim().split(/\s+/).filter(Boolean).length : 0;
  const characterCount = activeText.length;

  const searchMatchCount = useMemo(() => {
    if (!searchQuery || !searchQuery.trim() || !activeText) return 0;
    const escapedQuery = searchQuery.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matches = activeText.match(new RegExp(escapedQuery, "gi"));
    return matches ? matches.length : 0;
  }, [activeText, searchQuery]);

  const readability = calculateFleschKincaid(activeText, language);
  const readingTimeMinutes = Math.max(1, Math.ceil(readability.totalWords / 200));

  const handleAddEditTag = () => {
    const trimmed = tagInput.trim().replace(/[#,]/g, "");
    if (trimmed && !editedTags.includes(trimmed)) {
      setEditedTags([...editedTags, trimmed]);
      setTagInput("");
    }
  };

  const handleSave = () => {
    onUpdateContent(document.id, editedContent, changeSummary.trim() || undefined, editedTags);
    setIsEditing(false);
    setChangeSummary("");
  };

  const handleCancel = () => {
    setEditedContent(document.content);
    setEditedTags(document.tags || []);
    setTagInput("");
    setIsEditing(false);
    setChangeSummary("");
  };

  const handleDownloadMarkdown = () => {
    // Generar resumen del historial de versiones en formato Markdown
    let versionHistoryMarkdown = "";
    if (document.versions && document.versions.length > 0) {
      versionHistoryMarkdown = `## ${language === "es" ? "Historial de Versiones" : "Version History"}\n\n`;
      versionHistoryMarkdown += `| ${language === "es" ? "Versión" : "Version"} | ${language === "es" ? "Fecha/Hora" : "Date/Time"} | ${language === "es" ? "Resumen de Cambios" : "Change Summary"} | ${language === "es" ? "Título del Documento" : "Document Title"} |\n`;
      versionHistoryMarkdown += "| ------- | ---------- | ------------------ | -------------------- |\n";
      // Las versiones se muestran de más reciente a más antigua
      document.versions.forEach((v, idx) => {
        const verNum = `v${document.versions!.length - idx}`;
        const summary = v.changeSummary || (language === "es" ? "Sin resumen de cambios" : "No change summary");
        const docTitle = v.title || document.title || (language === "es" ? "Sin título" : "Untitled");
        versionHistoryMarkdown += `| ${verNum} | ${v.timestamp || "N/A"} | ${summary} | ${docTitle} |\n`;
      });
      versionHistoryMarkdown += "\n";
    } else {
      versionHistoryMarkdown = `## ${language === "es" ? "Historial de Versiones" : "Version History"}\n\n${language === "es" ? "No hay versiones registradas para este documento en la bóveda local." : "No registered versions for this document in the local secure vault."}\n\n`;
    }

    // Contenido completo formateado en Markdown
    const markdownContent = `# ${document.title || (language === "es" ? "Documento Sin Título" : "Untitled Document")}

**${language === "es" ? "Categoría" : "Category"}:** ${
      document.category === "Financiero" ? t("category.financial") :
      document.category === "Legal" ? t("category.legal") :
      document.category === "Técnico" ? t("category.technical") :
      document.category === "Recursos Humanos" ? t("category.hr") : document.category
    }
**${language === "es" ? "Fecha de Creación" : "Creation Date"}:** ${document.createdAt || "N/A"}

---

## ${language === "es" ? "Contenido del Documento" : "Document Content"}

${document.content || ""}

---

${versionHistoryMarkdown}
`;

    // Descargar como archivo .md
    const blob = new Blob([markdownContent], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    // Sanitizar el nombre del archivo
    const safeTitle = (document.title || "documento").replace(/[^a-zA-Z0-9íóáúéñÍÓÁÚÉÑ]/g, "_").toLowerCase();
    link.setAttribute("download", `${safeTitle}.md`);
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  const handleDownloadTxt = () => {
    // Generar contenido en formato de texto plano con metadatos estructurados
    const txtContent = `${document.title || (language === "es" ? "Documento Sin Título" : "Untitled Document")}
========================================
${language === "es" ? "Categoría" : "Category"}: ${
      document.category === "Financiero" ? t("category.financial") :
      document.category === "Legal" ? t("category.legal") :
      document.category === "Técnico" ? t("category.technical") :
      document.category === "Recursos Humanos" ? t("category.hr") : document.category
    }
${language === "es" ? "Fecha de Creación" : "Creation Date"}: ${document.createdAt || "N/A"}
========================================

${document.content || ""}
`;

    // Descargar como archivo .txt
    const blob = new Blob([txtContent], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    // Sanitizar el nombre del archivo
    const safeTitle = (document.title || "documento").replace(/[^a-zA-Z0-9íóáúéñÍÓÁÚÉÑ]/g, "_").toLowerCase();
    link.setAttribute("download", `${safeTitle}.txt`);
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-4 border-b border-slate-800/80 bg-slate-950/20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-950 border border-slate-800 rounded-xl">
            <FileText className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            {/* Breadcrumb Navigation Trail */}
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold tracking-wide uppercase mb-0.5 font-mono" id="document-breadcrumb">
              <span className="hover:text-indigo-400 transition-colors cursor-default">
                {language === "es" ? "Bóveda" : "Vault"}
              </span>
              <ChevronRight className="w-2.5 h-2.5 text-slate-700 shrink-0" />
              <span className="hover:text-indigo-400 transition-colors truncate max-w-[120px] cursor-default">
                {document.category === "Financiero" ? t("category.financial") :
                 document.category === "Legal" ? t("category.legal") :
                 document.category === "Técnico" ? t("category.technical") :
                 document.category === "Recursos Humanos" ? t("category.hr") : document.category}
              </span>
              <ChevronRight className="w-2.5 h-2.5 text-slate-700 shrink-0" />
              <span className="text-slate-400 truncate max-w-[150px] cursor-default">
                {document.title}
              </span>
            </div>

            <h2 className="text-sm font-bold text-slate-100 font-sans max-w-xs md:max-w-md truncate" id="document-title">
              {document.title}
            </h2>
            <div className="flex items-center gap-2.5 mt-1 text-xs text-slate-400 font-sans flex-wrap">
              <span className="flex items-center gap-1 shrink-0">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(document.createdAt).toLocaleDateString(language === "es" ? "es-MX" : "en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <span className={`px-2 py-0.5 border rounded-full text-[10px] font-semibold shrink-0 ${getCategoryColor(document.category)}`}>
                {document.category === "Financiero" ? t("category.financial") :
                 document.category === "Legal" ? t("category.legal") :
                 document.category === "Técnico" ? t("category.technical") :
                 document.category === "Recursos Humanos" ? t("category.hr") : document.category}
              </span>

              {/* Custom tags */}
              {document.tags && document.tags.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap" id="document-tags-display">
                  {document.tags.map((tag) => (
                    <span 
                      key={tag} 
                      className="flex items-center gap-1 px-2 py-0.5 border border-indigo-950/60 bg-indigo-950/40 text-indigo-300 rounded-full text-[10px] font-semibold shrink-0"
                    >
                      <Tag className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
                      <span>{tag}</span>
                    </span>
                  ))}
                </div>
              )}

              <span className="flex items-center gap-1.5 px-2 py-0.5 border border-slate-850 bg-slate-950/60 text-slate-300 rounded-full text-[10px] font-semibold shrink-0" id="reading-time-chip">
                <Clock className="w-3 h-3 text-indigo-400" />
                <span>{readingTimeMinutes} {readingTimeMinutes === 1 ? (language === "es" ? "min de lectura" : "min read") : (language === "es" ? "minutos de lectura" : "mins read")}</span>
              </span>

              {/* Dynamic Live Word & Character Count Indicator Chip */}
              <span 
                className={`flex items-center gap-1.5 px-2.5 py-0.5 border rounded-full text-[10px] font-semibold font-mono shrink-0 transition-all duration-300 ${
                  isEditing
                    ? "bg-amber-950/60 border-amber-700/60 text-amber-300 shadow-sm shadow-amber-950/40"
                    : "bg-slate-950/60 border-slate-850 text-slate-300"
                }`}
                id="word-character-count-chip"
                title={
                  language === "es"
                    ? `Conteo dinámico: ${wordCount} palabras, ${characterCount} caracteres`
                    : `Dynamic count: ${wordCount} words, ${characterCount} characters`
                }
              >
                <Type className={`w-3 h-3 shrink-0 ${isEditing ? "text-amber-400 animate-pulse" : provider === "cohere" ? "text-teal-400" : "text-indigo-400"}`} />
                <span>
                  <strong className="font-bold text-slate-100">{wordCount.toLocaleString()}</strong> {language === "es" ? "palabras" : "words"}
                </span>
                <span className="text-slate-600 font-normal">|</span>
                <span>
                  <strong className="font-bold text-slate-100">{characterCount.toLocaleString()}</strong> {language === "es" ? "caracteres" : "chars"}
                </span>
                {isEditing && (
                  <span className="text-[9px] font-sans font-bold bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded-md uppercase tracking-wider ml-0.5 animate-pulse">
                    {language === "es" ? "En vivo" : "Live"}
                  </span>
                )}
              </span>

              {/* Active Search Query Highlight Counter Chip */}
              {searchQuery && searchQuery.trim().length > 0 && (
                <span 
                  className={`flex items-center gap-1.5 px-2.5 py-0.5 border rounded-full text-[10px] font-semibold font-mono shrink-0 transition-all duration-300 ${
                    searchMatchCount > 0
                      ? "bg-amber-950/70 border-amber-700/70 text-amber-300 shadow-sm shadow-amber-950/30"
                      : "bg-slate-950/60 border-slate-800 text-slate-500 opacity-70"
                  }`}
                  id="search-highlight-chip"
                  title={
                    language === "es"
                      ? `Coincidencias resaltadas para "${searchQuery}": ${searchMatchCount}`
                      : `Highlighted matches for "${searchQuery}": ${searchMatchCount}`
                  }
                >
                  <Search className={`w-3 h-3 shrink-0 ${searchMatchCount > 0 ? "text-amber-400 animate-pulse" : "text-slate-500"}`} />
                  <span>
                    <strong className="font-bold text-slate-100">{searchMatchCount}</strong> {searchMatchCount === 1 ? (language === "es" ? "coincidencia" : "match") : (language === "es" ? "coincidencias" : "matches")}
                  </span>
                  <span className="text-amber-500/60 text-[9px] font-sans italic max-w-[80px] truncate">
                    "{searchQuery}"
                  </span>
                </span>
              )}

              {/* Dynamic Reading Progress Badge Chip */}
              <span 
                className={`flex items-center gap-1.5 px-2 py-0.5 border rounded-full text-[10px] font-semibold font-mono shrink-0 transition-all duration-300 ${
                  scrollPercent === 100 
                    ? "bg-emerald-950/60 border-emerald-800/60 text-emerald-400" 
                    : provider === "cohere"
                      ? "bg-teal-950/60 border-teal-800/60 text-teal-300"
                      : "bg-indigo-950/60 border-indigo-800/60 text-indigo-300"
                }`}
                id="reading-progress-chip"
                title={language === "es" ? "Progreso de lectura" : "Reading progress"}
              >
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${scrollPercent === 100 ? "bg-emerald-400" : provider === "cohere" ? "bg-teal-400" : "bg-indigo-400"}`} />
                <span>{scrollPercent}% {language === "es" ? "leído" : "read"}</span>
              </span>
              
              {/* Readability Score Metric Chip with Hover Tooltip */}
              <div 
                className={`flex items-center gap-1.5 px-2 py-0.5 border rounded-full text-[10px] font-semibold transition-all duration-300 select-none group relative cursor-help shrink-0 ${readability.colorClass}`}
                id="metric-readability-chip"
              >
                <BookOpen className="w-3 h-3 text-current animate-pulse shrink-0" />
                <span>{language === "es" ? "Legibilidad" : "Readability"}: {readability.score} ({readability.label})</span>

                {/* Interactive Tooltip showing detailed metrics */}
                <div className="absolute top-full left-0 mt-2.5 hidden group-hover:flex flex-col gap-2 p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-[10px] text-slate-300 font-mono w-52 shadow-2xl z-30 leading-normal pointer-events-none animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="text-indigo-400 font-bold border-b border-slate-850 pb-1.5 flex justify-between items-center">
                    <span>{language === "es" ? "MÉTRICAS LECTORAS" : "READABILITY METRICS"}</span>
                    <span className="text-[9px] bg-indigo-950 px-1.5 py-0.5 rounded text-indigo-300 font-semibold uppercase font-sans">Flesch</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{language === "es" ? "Índice Flesch:" : "Flesch Score:"}</span>
                    <span className="font-bold text-slate-100">{readability.score}/100</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{language === "es" ? "Nivel Escolar:" : "School Level:"}</span>
                    <span className="font-bold text-slate-100">{language === "es" ? "Grado " : "Grade "}{readability.gradeLevel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{language === "es" ? "Total Palabras:" : "Total Words:"}</span>
                    <span className="font-bold text-slate-100">{readability.totalWords}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{language === "es" ? "Total Frases:" : "Total Sentences:"}</span>
                    <span className="font-bold text-slate-100">{readability.totalSentences}</span>
                  </div>
                  <div className="text-[9px] text-slate-500 italic mt-0.5 pt-1.5 border-t border-slate-900 leading-tight">
                    {language === "es" ? "Promedio: " : "Average: "}{readability.totalWords > 0 ? (readability.totalSyllables / readability.totalWords).toFixed(1) : 0} {language === "es" ? "sílabas/palabra." : "syllables/word."} {isEditing ? (language === "es" ? "Recalculando..." : "Recalculating...") : (language === "es" ? "Tiempo real" : "Real-time")}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap md:flex-nowrap justify-end w-full md:w-auto">
          {/* Focus Mode toggle (available in both reading and editing modes) */}
          <button
            onClick={onToggleFocusMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
              isFocusMode
                ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-600/35"
                : "bg-slate-950 border-slate-800/85 text-slate-300 hover:bg-slate-900"
            }`}
            title={isFocusMode ? (language === "es" ? "Desactivar modo enfoque" : "Disable focus mode") : (language === "es" ? "Activar modo enfoque (ocultar paneles laterales)" : "Enable focus mode (hide side panels)")}
            id="btn-toggle-focus"
          >
            {isFocusMode ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="hidden md:inline font-sans">{language === "es" ? "Vista Normal" : "Normal View"}</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="hidden md:inline font-sans">{language === "es" ? "Modo Enfoque" : "Focus Mode"}</span>
              </>
            )}
          </button>

          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors shadow-sm cursor-pointer"
                title={language === "es" ? "Guardar cambios locales" : "Save local changes"}
                id="btn-save-doc-edits"
              >
                <Check className="w-3.5 h-3.5" />
                {language === "es" ? "Guardar" : "Save"}
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-950 border border-slate-800 hover:bg-slate-900 rounded-xl transition-colors cursor-pointer"
                title={language === "es" ? "Cancelar edición" : "Cancel editing"}
                id="btn-cancel-doc-edits"
              >
                <X className="w-3.5 h-3.5" />
                {language === "es" ? "Cancelar" : "Cancel"}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setShowHistory(!showHistory);
                  setSelectedPreviewVersionId(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                  showHistory
                    ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-600/35"
                    : "bg-slate-950 border-slate-800/80 text-slate-300 hover:bg-slate-900"
                }`}
                title={language === "es" ? "Ver historial de versiones y revertir cambios" : "View version history and revert changes"}
                id="btn-doc-history"
              >
                <History className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden md:inline">{language === "es" ? "Versiones" : "Versions"}</span>
                {document.versions && document.versions.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-indigo-600 text-white rounded-full text-[9px] font-bold leading-none">
                    {document.versions.length}
                  </span>
                )}
              </button>

              {userRole === "admin" && (
                <button
                  onClick={() => onDeleteDocument(document.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-400 bg-slate-950 border border-slate-800/80 hover:bg-rose-950/20 hover:border-rose-500/35 rounded-xl transition-colors cursor-pointer"
                  title={language === "es" ? "Eliminar este documento de la bóveda local" : "Delete this document from the local secure vault"}
                  id="btn-delete-doc"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{language === "es" ? "Eliminar" : "Delete"}</span>
                </button>
              )}

              {/* Dropdown de descarga */}
              <div className="relative inline-block text-left" id="download-dropdown-wrapper">
                <button
                  onClick={() => setShowDownloadDropdown(!showDownloadDropdown)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-400 bg-slate-950 border border-slate-800/80 hover:bg-emerald-950/20 hover:border-emerald-500/35 rounded-xl transition-colors cursor-pointer"
                  title={language === "es" ? "Descargar opciones" : "Download options"}
                  id="btn-download-doc"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{language === "es" ? "Descargar" : "Download"}</span>
                  <ChevronDown className="w-3 h-3 ml-0.5 opacity-80" />
                </button>

                {showDownloadDropdown && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowDownloadDropdown(false)} 
                    />
                    <div 
                      className="absolute right-0 mt-2 w-56 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl z-20 py-1.5 divide-y divide-slate-900 animate-in fade-in slide-in-from-top-1 duration-100" 
                      id="download-format-options"
                    >
                      <button
                        onClick={() => {
                          handleDownloadTxt();
                          setShowDownloadDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-900 hover:text-emerald-400 transition-all flex items-center gap-2.5 cursor-pointer"
                        id="btn-download-txt-option"
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span>{language === "es" ? "Texto Plano (.txt)" : "Plain Text (.txt)"}</span>
                          <span className="text-[9px] text-slate-500 font-normal truncate">
                            {language === "es" ? "Contenido y metadatos básicos" : "Content and basic metadata"}
                          </span>
                        </div>
                      </button>
                      
                      <button
                        onClick={() => {
                          handleDownloadMarkdown();
                          setShowDownloadDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-900 hover:text-emerald-400 transition-all flex items-center gap-2.5 cursor-pointer"
                        id="btn-download-md-option"
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span>{language === "es" ? "Markdown (.md)" : "Markdown (.md)"}</span>
                          <span className="text-[9px] text-slate-500 font-normal truncate">
                            {language === "es" ? "Incluye historial de versiones" : "Includes version history"}
                          </span>
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {userRole === "admin" && (
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setShowHistory(false);
                    setSelectedPreviewVersionId(null);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-950 border border-slate-800 hover:bg-slate-900 rounded-xl transition-colors shadow-sm cursor-pointer"
                  title={language === "es" ? "Editar texto del documento" : "Edit document text"}
                  id="btn-edit-doc"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden md:inline">{language === "es" ? "Editar Texto" : "Edit Text"}</span>
                </button>
              )}

              <button
                onClick={() => onTriggerReanalyze(document.id)}
                disabled={isAnalyzing}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-xl transition-all shadow-md cursor-pointer disabled:bg-slate-950/60 disabled:text-slate-500 ${
                  provider === "cohere"
                    ? "bg-teal-600 hover:bg-teal-500 shadow-teal-600/10"
                    : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/10"
                }`}
                title={
                  language === "es"
                    ? `Volver a analizar con ${provider === "cohere" ? "Cohere" : "Gemini"}`
                    : `Reanalyze with ${provider === "cohere" ? "Cohere" : "Gemini"}`
                }
                id="btn-reanalyze-doc"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? "animate-spin" : ""}`} />
                <span className="hidden md:inline">
                  {isAnalyzing ? (language === "es" ? "Analizando..." : "Analyzing...") : (language === "es" ? "Reanalizar" : "Reanalyze")}
                </span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Scroll Progress Bar */}
      <div className="w-full bg-slate-950/90 h-1.5 shrink-0 relative border-b border-slate-850/80 overflow-hidden" id="scroll-progress-container">
        <div 
          className={`h-full transition-all duration-150 rounded-r-full relative ${
            provider === "cohere"
              ? "bg-gradient-to-r from-teal-500 via-emerald-400 to-cyan-400 shadow-[0_0_12px_rgba(20,184,166,0.6)]"
              : "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-[0_0_12px_rgba(99,102,241,0.6)]"
          }`}
          style={{ width: `${scrollPercent}%` }}
          id="scroll-progress-bar"
        >
          {/* Glowing pulse tip on trailing edge */}
          {scrollPercent > 0 && scrollPercent < 100 && (
            <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/80 rounded-full blur-[1px] shadow-[0_0_8px_#fff]" />
          )}
        </div>
      </div>

      {/* Main split container */}
      <div className="flex-1 flex flex-row overflow-hidden">
        {/* Workspace Paper Area */}
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-6 bg-slate-950/40 relative flex flex-col"
        >
          {/* Warning banner for preview mode */}
          {isPreviewing && (
            <div className={`mb-4 mx-auto w-full bg-slate-900 border border-slate-800 text-slate-300 px-4 py-3.5 rounded-2xl text-xs flex flex-col gap-3 font-sans shadow-lg transition-all duration-300 ${isCompareMode ? "max-w-5xl md:max-w-6xl" : "max-w-2xl"}`} id="preview-mode-banner">
              {/* Row 1: Status & Actions */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-850 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500 shrink-0 animate-pulse" />
                  <span className="text-slate-300">
                    {language === "es" ? "Previsualizando versión:" : "Previewing version:"} <strong className="text-indigo-400">"{previewVersion?.changeSummary || (language === "es" ? "Edición manual" : "Manual edit")}"</strong> ({previewVersion?.timestamp})
                  </span>
                </div>
                
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  {userRole === "admin" && (
                    <button
                      onClick={() => {
                        if (previewVersion) {
                          onRevertToVersion(document.id, previewVersion.id);
                          setSelectedPreviewVersionId(null);
                        }
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold transition-all cursor-pointer shadow-sm text-[10px]"
                      id="btn-restore-version-banner"
                    >
                      <RotateCcw className="w-3 h-3" />
                      {language === "es" ? "Restaurar versión" : "Restore version"}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectedPreviewVersionId(null);
                      setIsCompareMode(false);
                    }}
                    className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-lg font-semibold transition-all cursor-pointer border border-slate-800 text-[10px]"
                    id="btn-cancel-preview-banner"
                  >
                    {language === "es" ? "Salir" : "Exit"}
                  </button>
                </div>
              </div>

              {/* Row 2: Diff Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-0.5">
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                    {language === "es" ? "Modo de Vista:" : "View Mode:"}
                  </span>
                  <div className="inline-flex bg-slate-950 p-0.5 rounded-lg border border-slate-850">
                    <button
                      onClick={() => setIsCompareMode(false)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all text-[10px] font-semibold cursor-pointer ${
                        !isCompareMode 
                          ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/30" 
                          : "text-slate-400 hover:text-slate-200 border border-transparent"
                      }`}
                    >
                      <FileText className="w-3 h-3" />
                      {language === "es" ? "Normal" : "Normal"}
                    </button>
                    <button
                      onClick={() => setIsCompareMode(true)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all text-[10px] font-semibold cursor-pointer ${
                        isCompareMode 
                          ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/30" 
                          : "text-slate-400 hover:text-slate-200 border border-transparent"
                      }`}
                      id="btn-compare-changes"
                    >
                      <GitCompare className="w-3 h-3" />
                      {language === "es" ? "Comparar Cambios" : "Compare Changes"}
                    </button>
                  </div>
                </div>

                {isCompareMode && (
                  <div className="flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-left-1 duration-150">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                      {language === "es" ? "Comparar con:" : "Compare with:"}
                    </span>
                    <div className="inline-flex bg-slate-950 p-0.5 rounded-lg border border-slate-850">
                      <button
                        onClick={() => setCompareTarget("live")}
                        className={`px-2.5 py-1 rounded-md transition-all text-[10px] font-semibold cursor-pointer ${
                          compareTarget === "live" 
                            ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/30" 
                            : "text-slate-400 hover:text-slate-200 border border-transparent"
                        }`}
                        id="compare-target-live"
                      >
                        {language === "es" ? "Versión Actual" : "Current Version"}
                      </button>
                      <button
                        disabled={!previousVersion}
                        onClick={() => setCompareTarget("previous")}
                        className={`px-2.5 py-1 rounded-md transition-all text-[10px] font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                          compareTarget === "previous" 
                            ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/30" 
                            : "text-slate-400 hover:text-slate-200 border border-transparent"
                        }`}
                        id="compare-target-previous"
                        title={!previousVersion ? (language === "es" ? "No hay versión anterior" : "No previous version available") : ""}
                      >
                        {language === "es" ? "Versión Anterior" : "Previous Version"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className={`mx-auto w-full bg-slate-950 min-h-[500px] shadow-lg border border-slate-800/80 rounded-2xl p-6 md:p-8 relative overflow-hidden transition-all duration-300 ${isCompareMode && isPreviewing ? "max-w-5xl md:max-w-6xl" : "max-w-2xl"}`}>
            {/* Paper decorative corner watermark */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-500/5 to-transparent pointer-events-none" />
            
            {isEditing ? (
              <div className="flex flex-col gap-4 h-full" id="editing-container">
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full h-[400px] text-sm text-slate-200 font-mono p-4 border border-indigo-500/30 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl outline-none resize-none leading-relaxed bg-slate-900/60"
                  placeholder={language === "es" ? "Escribe o pega el contenido del documento aquí..." : "Write or paste the document content here..."}
                  id="doc-edit-textarea"
                />
                <div className="flex flex-col gap-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-850">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                    {language === "es" ? "Resumen de cambios (Opcional)" : "Change summary (Optional)"}
                  </label>
                  <input
                    type="text"
                    value={changeSummary}
                    onChange={(e) => setChangeSummary(e.target.value)}
                    placeholder={language === "es" ? "Ej: Corregido error en párrafo 3, actualizado cifras de reporte..." : "e.g., Fixed typo in paragraph 3, updated report figures..."}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500 transition-all font-sans"
                    id="doc-edit-change-summary"
                  />
                </div>

                {/* Edit Tags Section */}
                <div className="flex flex-col gap-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-850" id="doc-edit-tags-container">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-indigo-400" />
                    {language === "es" ? "Editar Etiquetas Personalizadas" : "Edit Custom Tags"}
                  </label>
                  
                  <div className="flex flex-wrap gap-1.5 mb-1" id="edited-tags-chips-container">
                    {editedTags.length === 0 ? (
                      <span className="text-[11px] text-slate-500 italic">
                        {language === "es" ? "Ninguna etiqueta." : "No tags."}
                      </span>
                    ) : (
                      editedTags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-indigo-950/60 text-indigo-300 border border-indigo-850/60 rounded-lg"
                        >
                          #{tag}
                          <button
                            type="button"
                            onClick={() => setEditedTags(editedTags.filter((t) => t !== tag))}
                            className="text-slate-400 hover:text-rose-400 font-bold transition-colors ml-1 cursor-pointer font-sans"
                            style={{ fontSize: '10px' }}
                          >
                            ×
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === ",") {
                          e.preventDefault();
                          handleAddEditTag();
                        }
                      }}
                      placeholder={
                        language === "es"
                          ? "Escribe etiqueta y presiona Enter o ','"
                          : "Type tag and press Enter or ','"
                      }
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-indigo-500 transition-all font-sans"
                      id="doc-edit-tag-input"
                    />
                    <button
                      type="button"
                      disabled={!tagInput.trim()}
                      onClick={handleAddEditTag}
                      className="px-3 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl transition-all cursor-pointer"
                      id="btn-add-edit-tag"
                    >
                      {language === "es" ? "Añadir" : "Add"}
                    </button>
                  </div>
                </div>
              </div>
            ) : isCompareMode && isPreviewing ? (
              /* Render Side-by-side diff viewer */
              <div className="flex flex-col gap-4 animate-in fade-in duration-300" id="diff-viewer-container">
                {/* Header info with descriptions */}
                <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-850/60 select-none">
                  {/* Left Column Header (Reference Version) */}
                  <div className="flex flex-col gap-1 pl-3 border-l-2 border-l-rose-500/50">
                    <span className="text-[10px] font-bold text-rose-400/90 font-mono uppercase tracking-widest">
                      {compareTarget === "previous" 
                        ? (language === "es" ? "Antes (Versión Anterior)" : "Before (Previous Version)")
                        : (language === "es" ? "Antes (Versión Seleccionada)" : "Before (Selected Version)")
                      }
                    </span>
                    <span className="text-xs font-semibold text-slate-300 font-sans truncate">
                      {compareTarget === "previous" && previousVersion
                        ? `"${previousVersion.changeSummary || (language === "es" ? "Edición manual" : "Manual edit")}"`
                        : `"${previewVersion?.changeSummary || (language === "es" ? "Edición manual" : "Manual edit")}"`
                      }
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {compareTarget === "previous" && previousVersion ? previousVersion.timestamp : previewVersion?.timestamp}
                    </span>
                  </div>

                  {/* Right Column Header (Comparison Version) */}
                  <div className="flex flex-col gap-1 pl-3 border-l-2 border-l-emerald-500/50">
                    <span className="text-[10px] font-bold text-emerald-400/90 font-mono uppercase tracking-widest">
                      {compareTarget === "previous" 
                        ? (language === "es" ? "Después (Versión Seleccionada)" : "After (Selected Version)")
                        : (language === "es" ? "Después (Versión Actual)" : "After (Current Live)")
                      }
                    </span>
                    <span className="text-xs font-semibold text-slate-300 font-sans truncate">
                      {compareTarget === "previous" 
                        ? `"${previewVersion?.changeSummary || (language === "es" ? "Edición manual" : "Manual edit")}"`
                        : (language === "es" ? "Documento Activo" : "Active Live Document")
                      }
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {compareTarget === "previous" ? previewVersion?.timestamp : (language === "es" ? "Tiempo Real" : "Real-time")}
                    </span>
                  </div>
                </div>

                {/* Diff Panels Side-by-Side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-px md:bg-slate-900 border border-slate-850 rounded-xl overflow-hidden bg-slate-950">
                  {/* Left Panel */}
                  <div className="flex flex-col bg-slate-950/60 max-h-[500px] overflow-y-auto" id="diff-panel-left">
                    {diffData.left.length > 0 ? (
                      diffData.left.map((line, idx) => (
                        <div key={`left-${idx}`}>
                          {renderDiffLine(line, 'left', diffData.right[idx])}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-10 text-slate-500 font-mono text-xs">
                        {language === "es" ? "No hay diferencias de texto." : "No text differences."}
                      </div>
                    )}
                  </div>

                  {/* Right Panel */}
                  <div className="flex flex-col bg-slate-950/60 max-h-[500px] overflow-y-auto" id="diff-panel-right">
                    {diffData.right.length > 0 ? (
                      diffData.right.map((line, idx) => (
                        <div key={`right-${idx}`}>
                          {renderDiffLine(line, 'right', diffData.left[idx])}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-10 text-slate-500 font-mono text-xs">
                        {language === "es" ? "No hay diferencias de texto." : "No text differences."}
                      </div>
                    )}
                  </div>
                </div>

                {/* Legend or Quick Guidance */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-slate-500 font-mono select-none pt-2 border-t border-slate-900 leading-normal">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-rose-950/40 border border-rose-500/40" />
                    <span>{language === "es" ? "Texto Eliminado / Modificado" : "Removed / Modified Text"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-emerald-950/15 border border-emerald-500/40" />
                    <span>{language === "es" ? "Texto Añadido" : "Added Text"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="bg-emerald-900/60 px-1 py-0.2 rounded text-emerald-100 font-bold">abc</span>
                    <span>{language === "es" ? "Cambio de palabra específico" : "Specific word modification"}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="prose prose-invert max-w-none text-slate-300 font-sans leading-relaxed whitespace-pre-wrap text-sm" id="document-content-text">
                {contentToDisplay ? (
                  highlightSearchText(contentToDisplay, searchQuery)
                ) : (
                  <div className="text-center py-20 text-slate-500 font-mono">
                    {language === "es" ? "[Este documento está vacío. Añade contenido en modo Edición]" : "[This document is empty. Add content in Edit mode]"}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar for Version History */}
        {showHistory && (
          <div className="w-80 border-l border-slate-800 bg-slate-900/40 flex flex-col h-full shrink-0" id="version-history-sidebar">
            <div className="p-4 border-b border-slate-800/80 bg-slate-950/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold text-slate-200 font-sans">
                  {language === "es" ? "Historial de Cambios" : "Change History"}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowHistory(false);
                  setSelectedPreviewVersionId(null);
                }}
                className="text-slate-500 hover:text-slate-300 p-1 hover:bg-slate-800 rounded-lg cursor-pointer transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {document.versions && document.versions.length > 0 ? (
                <div className="relative border-l-2 border-slate-800 pl-4 ml-2 space-y-4">
                  {document.versions.map((version) => {
                    const isSelected = selectedPreviewVersionId === version.id;
                    return (
                      <div key={version.id} className="relative group/item">
                        {/* Circle bullet node */}
                        <div className={`absolute -left-[25px] top-1.5 w-3.5 h-3.5 rounded-full border-2 transition-all ${
                          isSelected 
                            ? "bg-indigo-500 border-indigo-400 scale-110 shadow-sm shadow-indigo-500/25" 
                            : "bg-slate-950 border-slate-700 group-hover/item:border-indigo-500/40"
                        }`} />
                        
                        <div 
                          onClick={() => setSelectedPreviewVersionId(isSelected ? null : version.id)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer text-left ${
                            isSelected 
                              ? "bg-indigo-950/40 border-indigo-500/40 shadow-sm" 
                              : "bg-slate-950/40 border-slate-850 hover:bg-slate-950 hover:border-slate-800"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-slate-500 font-mono font-medium">
                              {version.timestamp}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.2 bg-slate-950 border border-slate-850 text-slate-400 rounded-md font-mono">
                              {version.id}
                            </span>
                          </div>
                          
                          <h4 className="text-xs font-bold text-slate-200 font-sans group-hover/item:text-indigo-400 transition-colors">
                            {version.changeSummary || (language === "es" ? "Edición manual" : "Manual edit")}
                          </h4>

                          <p className="text-[10px] text-slate-400 font-mono truncate mt-1">
                            {version.content.substring(0, 45)}...
                          </p>

                          {/* Quick Restore link button inside item */}
                          {userRole === "admin" && (
                            <div className="mt-2.5 flex items-center justify-end gap-2 border-t border-slate-850/50 pt-2 opacity-0 group-hover/item:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRevertToVersion(document.id, version.id);
                                    setSelectedPreviewVersionId(null);
                                }}
                                className="text-[9px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 uppercase tracking-wider font-mono bg-indigo-950/30 px-2 py-1 rounded border border-indigo-900/30 hover:border-indigo-500/40 cursor-pointer"
                              >
                                <RotateCcw className="w-2.5 h-2.5" />
                                {language === "es" ? "Revertir" : "Revert"}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500 font-mono text-[10px] uppercase tracking-wider flex flex-col items-center justify-center gap-2 select-none">
                  <GitCommit className="w-8 h-8 text-slate-700 mb-1" />
                  <span>{language === "es" ? "Sin versiones previas" : "No previous versions"}</span>
                  <span className="text-[9px] text-slate-600 font-sans lowercase max-w-[180px] mt-1 italic text-center">
                    {language === "es" ? "Modifica el contenido del documento para crear una versión automática" : "Modify the document content to automatically save a new version"}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
