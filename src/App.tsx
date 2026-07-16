import React, { useState, useEffect } from "react";
import { INITIAL_DOCUMENTS } from "./initialDocuments";
import { DocumentItem, ChatMessage } from "./types";
import DocumentViewer from "./components/DocumentViewer";
import AiInsightsPanel from "./components/AiInsightsPanel";
import DocumentUploader from "./components/DocumentUploader";
import ComparePanel from "./components/ComparePanel";
import { motion, AnimatePresence } from "motion/react";
import { 
  Brain, 
  Plus, 
  ArrowLeftRight, 
  Search, 
  DollarSign, 
  Scale, 
  Cpu, 
  Users, 
  FileText, 
  Sparkles,
  Cloud,
  CheckCircle2,
  Trash2,
  Menu,
  X,
  FileCode,
  Layers,
  Database
} from "lucide-react";

export default function App() {
  // Load documents from localStorage or fall back to pre-defined ones
  const [documents, setDocuments] = useState<DocumentItem[]>(() => {
    const saved = localStorage.getItem("documind_docs");
    return saved ? JSON.parse(saved) : INITIAL_DOCUMENTS;
  });

  const [activeDocId, setActiveDocId] = useState<string>(() => {
    const saved = localStorage.getItem("documind_active_id");
    return saved || (documents[0]?.id || "");
  });

  const [activeView, setActiveView] = useState<"viewer" | "upload" | "compare">("viewer");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
  
  // Clock state for Bento clock card
  const [time, setTime] = useState(new Date());

  // Keep chats state grouped by document ID
  const [chatsByDoc, setChatsByDoc] = useState<Record<string, ChatMessage[]>>(() => {
    const saved = localStorage.getItem("documind_chats");
    return saved ? JSON.parse(saved) : {};
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [docIdToDelete, setDocIdToDelete] = useState<string | null>(null);

  // Sync state changes with local storage
  useEffect(() => {
    localStorage.setItem("documind_docs", JSON.stringify(documents));
  }, [documents]);

  useEffect(() => {
    if (activeDocId) {
      localStorage.setItem("documind_active_id", activeDocId);
    }
  }, [activeDocId]);

  useEffect(() => {
    localStorage.setItem("documind_chats", JSON.stringify(chatsByDoc));
  }, [chatsByDoc]);

  // Live timer tick
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Handle document deletion (opens custom modal)
  const handleDeleteDocument = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDocIdToDelete(id);
  };

  const confirmDeleteDocument = () => {
    if (!docIdToDelete) return;
    const id = docIdToDelete;
    const remainingDocs = documents.filter((doc) => doc.id !== id);
    setDocuments(remainingDocs);
    
    // Clear chats for deleted document
    const updatedChats = { ...chatsByDoc };
    delete updatedChats[id];
    setChatsByDoc(updatedChats);

    if (activeDocId === id) {
      setActiveDocId(remainingDocs[0]?.id || "");
    }
    setDocIdToDelete(null);
  };

  // Handle content update (Inline Editing)
  const handleUpdateContent = (id: string, newContent: string) => {
    setDocuments((prevDocs) =>
      prevDocs.map((doc) =>
        doc.id === id ? { ...doc, content: newContent } : doc
      )
    );
  };

  // Reanalyze document via Backend Gemini API
  const handleTriggerReanalyze = async (id: string) => {
    const targetDoc = documents.find((doc) => doc.id === id);
    if (!targetDoc) return;

    setIsAnalyzing(true);
    try {
      const response = await fetch("/api/documents/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: targetDoc.content,
          filename: targetDoc.title,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "No se pudo completar la llamada al modelo AI.");
      }

      const analysisResult = await response.json();

      setDocuments((prevDocs) =>
        prevDocs.map((doc) =>
          doc.id === id
            ? {
                ...doc,
                category: analysisResult.category || doc.category,
                analysis: analysisResult,
              }
            : doc
        )
      );
    } catch (err: any) {
      alert(`Error reanalizando el documento: ${err.message || "Fallo técnico"}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle executive summary generation via Gemini API
  const handleGenerateExecutiveSummary = async (docId: string) => {
    const targetDoc = documents.find((doc) => doc.id === docId);
    if (!targetDoc) return;

    setIsGeneratingSummary(true);
    try {
      const response = await fetch("/api/documents/executive-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: targetDoc.content,
          title: targetDoc.title,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "No se pudo generar el resumen ejecutivo.");
      }

      const data = await response.json();

      setDocuments((prevDocs) =>
        prevDocs.map((doc) =>
          doc.id === docId
            ? {
                ...doc,
                executiveSummary: data.text,
              }
            : doc
        )
      );
    } catch (err: any) {
      alert(`Error al generar el resumen ejecutivo: ${err.message || "Fallo técnico"}`);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // Handle custom interactive Q&A (Contextual Chat)
  const handleSendMessage = async (docId: string, messageText: string) => {
    const targetDoc = documents.find((doc) => doc.id === docId);
    if (!targetDoc) return;

    const userMessage: ChatMessage = {
      id: "msg-" + Date.now(),
      role: "user",
      content: messageText,
      timestamp: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
    };

    // Append user message instantly
    const docChats = chatsByDoc[docId] || [];
    const updatedChatsWithUser = [...docChats, userMessage];
    setChatsByDoc({
      ...chatsByDoc,
      [docId]: updatedChatsWithUser,
    });

    setIsChatLoading(true);

    try {
      const response = await fetch("/api/documents/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: targetDoc.content,
          query: messageText,
          history: docChats, // send existing conversation context
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Error en el procesamiento del chat");
      }

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: "msg-reply-" + Date.now(),
        role: "assistant",
        content: data.text,
        timestamp: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
      };

      setChatsByDoc((prev) => ({
        ...prev,
        [docId]: [...updatedChatsWithUser, assistantMessage],
      }));
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: "msg-err-" + Date.now(),
        role: "assistant",
        content: `Error al contactar a Gemini: ${err.message || "Revisa la conexión de red."}`,
        timestamp: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
      };
      setChatsByDoc((prev) => ({
        ...prev,
        [docId]: [...updatedChatsWithUser, errorMessage],
      }));
    } finally {
      setIsChatLoading(false);
    }
  };

  // Filter documents based on Search Input & Category selections
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory =
      selectedCategory === "Todos" || doc.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const activeDoc = documents.find((doc) => doc.id === activeDocId) || documents[0];

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "Financiero":
        return <DollarSign className="w-4 h-4 text-emerald-600" />;
      case "Legal":
        return <Scale className="w-4 h-4 text-indigo-600" />;
      case "Técnico":
        return <Cpu className="w-4 h-4 text-cyan-600" />;
      case "Recursos Humanos":
        return <Users className="w-4 h-4 text-amber-600" />;
      default:
        return <FileText className="w-4 h-4 text-slate-500" />;
    }
  };

  const getCategoryColorBorder = (cat: string) => {
    switch (cat) {
      case "Financiero":
        return "border-l-4 border-l-emerald-500";
      case "Legal":
        return "border-l-4 border-l-indigo-500";
      case "Técnico":
        return "border-l-4 border-l-cyan-500";
      case "Recursos Humanos":
        return "border-l-4 border-l-amber-500";
      default:
        return "border-l-4 border-l-slate-400";
    }
  };

  const countByCategory = (cat: string) => {
    if (cat === "Todos") return documents.length;
    return documents.filter((doc) => doc.category === cat).length;
  };

  const activeDocChats = activeDoc ? chatsByDoc[activeDoc.id] || [] : [];

  return (
    <div className="flex h-screen w-full bg-slate-950 overflow-hidden text-slate-100" id="documind-root-layout">
      
      {/* 1. SIDEBAR (280px Desktop, hidden/overlay on Mobile) */}
      <aside 
        className={`fixed inset-y-0 left-0 z-30 w-72 bg-slate-900 border-r border-slate-800/80 flex flex-col justify-between transition-transform duration-300 transform ${
          isFocusMode
            ? "-translate-x-full lg:-translate-x-full lg:fixed"
            : "lg:translate-x-0 lg:static"
        } ${
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        id="sidebar"
      >
        {/* Header Logo & Bento Info Cards */}
        <div className="p-5 border-b border-slate-800/80 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
                <Brain className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-100 tracking-tight font-sans">
                  DocuMind AI
                </h1>
                <span className="text-[10px] text-indigo-400 font-bold font-mono tracking-wider block -mt-0.5 uppercase">
                  Bento Cognitive Suite
                </span>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button 
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden p-1.5 hover:bg-slate-800 rounded-lg text-slate-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Infrastructure Health Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-semibold text-slate-400 font-mono">
                Bóveda Segura Operativa
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-indigo-400 font-bold font-mono">
              <Cloud className="w-3.5 h-3.5" />
              <span>{documents.length} Synced</span>
            </div>
          </div>

          {/* Bento Clock / Date Card */}
          <div className="bg-amber-500 text-amber-950 border border-amber-400 rounded-xl p-3.5 flex flex-col justify-between shadow-lg shadow-amber-500/10">
            <div className="text-[9px] font-bold uppercase tracking-widest opacity-85 font-mono">London UTC</div>
            <div className="text-3xl font-mono font-bold leading-none my-1">
              {time.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
            </div>
            <div className="text-[10px] font-semibold opacity-90 uppercase">
              {time.toLocaleDateString("es-ES", { weekday: "short", month: "short", day: "numeric" })}
            </div>
          </div>
        </div>

        {/* Categories Quick Filter tab list */}
        <div className="px-5 py-3 border-b border-slate-800/80 bg-slate-950/20">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block mb-2">
            Categorías
          </span>
          <div className="flex flex-wrap gap-1">
            {["Todos", "Financiero", "Legal", "Técnico", "Recursos Humanos"].map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setActiveView("viewer");
                  }}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 border cursor-pointer ${
                    isSelected
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-slate-950/40 text-slate-400 border-slate-800/80 hover:bg-slate-800/80"
                  }`}
                >
                  <span>{cat}</span>
                  <span className={`px-1 rounded-full text-[8px] ${isSelected ? "bg-white/20 text-white" : "bg-slate-800 text-slate-500"}`}>
                    {countByCategory(cat)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Search and Document Scroll List */}
        <div className="flex-1 flex flex-col p-4 overflow-hidden">
          {/* Search box */}
          <div className="relative mb-3.5">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar documento en bóveda..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800/80 focus:border-indigo-500 focus:bg-slate-900 rounded-lg pl-9 pr-4 py-2 text-xs outline-none transition-all font-sans text-slate-200 placeholder-slate-500"
              id="sidebar-search-input"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-xs text-slate-500 hover:text-slate-300 font-mono font-bold"
              >
                ×
              </button>
            )}
          </div>

          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block mb-2 px-1">
            Archivos del Repositorio ({filteredDocuments.length})
          </span>

          {/* Document scroll container */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {filteredDocuments.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs font-mono">
                Ningún documento encontrado.
              </div>
            ) : (
              filteredDocuments.map((doc) => {
                const isActive = doc.id === activeDocId && activeView === "viewer";
                return (
                  <div
                    key={doc.id}
                    onClick={() => {
                      setActiveDocId(doc.id);
                      setActiveView("viewer");
                      setMobileSidebarOpen(false);
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start justify-between relative group ${
                      isActive
                        ? "bg-slate-800 border-indigo-500/40 shadow-xs"
                        : "bg-slate-950/30 border-slate-850 hover:bg-slate-800/40"
                    } ${getCategoryColorBorder(doc.category)}`}
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(doc.category)}
                        <h3 className="text-xs font-bold text-slate-200 truncate font-sans">
                          {doc.title}
                        </h3>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[9px] text-slate-500 font-mono">
                          {new Date(doc.createdAt).toLocaleDateString("es-ES", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <span className="text-[8px] text-slate-500">•</span>
                        <span className="text-[9px] font-semibold text-indigo-400">
                          {doc.category}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Trash Delete button */}
                      <button
                        onClick={(e) => handleDeleteDocument(doc.id, e)}
                        className="opacity-40 hover:opacity-100 group-hover:opacity-100 p-1 hover:bg-red-950/50 text-slate-400 hover:text-red-400 rounded-md transition-all cursor-pointer"
                        title="Eliminar documento"
                        id={`btn-delete-sidebar-${doc.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Status dot */}
                      <span className={`w-2 h-2 rounded-full ${
                        doc.status === "Deployed" ? "bg-emerald-500" : "bg-amber-500"
                      }`} title={doc.status} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Global Bottom Actions */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/30 flex flex-col gap-2">
          <button
            onClick={() => {
              setActiveView("upload");
              setMobileSidebarOpen(false);
            }}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 px-4 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-600/10 cursor-pointer"
            id="btn-sidebar-new-doc"
          >
            <Plus className="w-4 h-4" />
            Ingresar Documento
          </button>
          
          <button
            onClick={() => {
              setActiveView("compare");
              setMobileSidebarOpen(false);
            }}
            className="w-full bg-slate-950 hover:bg-slate-900 text-slate-300 py-2 px-4 rounded-xl font-semibold text-xs border border-slate-800 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            id="btn-sidebar-compare-docs"
          >
            <ArrowLeftRight className="w-4 h-4 text-indigo-400" />
            Comparación Cruzada AI
          </button>
        </div>
      </aside>

      {/* Backdrop for mobile sidebar drawer */}
      {mobileSidebarOpen && (
        <div 
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-20 lg:hidden"
        />
      )}

      {/* 2. MAIN WORKSPACE CONTENT */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-slate-950">
        {/* Top Navbar */}
        <header className="h-14 bg-slate-900 border-b border-slate-800/80 px-4 md:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-slate-400 text-xs font-mono font-medium">
              <Database className="w-4 h-4 text-indigo-400" />
              <span>Vault: /secure_env</span>
              <span>/</span>
              <span className="text-slate-100 font-bold">
                {activeView === "viewer" ? "Visualizador e Insights" : activeView === "upload" ? "Ingesta de Documentos" : "Comparador de Bóveda"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            {/* Environment Credentials status */}
            <div className="hidden sm:flex items-center gap-1.5 text-emerald-400 bg-emerald-950/40 border border-emerald-900/40 rounded-full px-3 py-1 font-mono text-[10px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Gemini v3.5 Flash Activo</span>
            </div>
            
            {/* User credentials identifier */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-slate-850 border border-slate-800 rounded-full flex items-center justify-center text-[10px] font-bold text-indigo-400 uppercase">
                AD
              </div>
              <span className="hidden md:inline text-xs text-slate-300">Enterprise Admin</span>
            </div>
          </div>
        </header>

        {/* Scrollable View Area container */}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {activeView === "viewer" && activeDoc ? (
              <motion.div
                key={`viewer-${activeDoc.id}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="h-full flex flex-col lg:flex-row p-4 md:p-6 gap-6 overflow-hidden"
              >
                {/* Left panel: Original Document Viewer */}
                <div className="flex-1 h-full min-h-[350px] lg:min-h-0">
                  <DocumentViewer
                    document={activeDoc}
                    onUpdateContent={handleUpdateContent}
                    onTriggerReanalyze={handleTriggerReanalyze}
                    isAnalyzing={isAnalyzing}
                    isFocusMode={isFocusMode}
                    onToggleFocusMode={() => setIsFocusMode(!isFocusMode)}
                    onDeleteDocument={handleDeleteDocument}
                  />
                </div>

                {/* Right panel: AI Cognitive Insights & Chat */}
                {!isFocusMode && (
                  <div className="w-full lg:w-[420px] xl:w-[460px] h-full shrink-0 flex flex-col min-h-[400px] lg:min-h-0 animate-in fade-in slide-in-from-right-4 duration-300">
                    <AiInsightsPanel
                      document={activeDoc}
                      chats={activeDocChats}
                      onSendMessage={handleSendMessage}
                      isChatLoading={isChatLoading}
                      isAnalyzing={isAnalyzing}
                      onGenerateExecutiveSummary={handleGenerateExecutiveSummary}
                      isGeneratingSummary={isGeneratingSummary}
                    />
                  </div>
                )}
              </motion.div>
            ) : activeView === "upload" ? (
              <motion.div
                key="uploader-view"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="h-full p-4 md:p-6 overflow-y-auto"
              >
                <div className="max-w-4xl mx-auto">
                  <DocumentUploader
                    onAddDocument={(newDoc) => {
                      setDocuments([newDoc, ...documents]);
                      setActiveDocId(newDoc.id);
                      setActiveView("viewer");
                    }}
                    onCancel={() => setActiveView("viewer")}
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="compare-view"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="h-full p-4 md:p-6 overflow-y-auto"
              >
                <div className="max-w-4xl mx-auto">
                  <ComparePanel
                    documents={documents}
                    onCancel={() => setActiveView("viewer")}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Elegant Custom Deletion Confirmation Modal */}
      <AnimatePresence>
        {docIdToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden"
              id="confirm-delete-modal"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-rose-500/5 to-transparent pointer-events-none" />
              
              <div className="flex items-center gap-3.5 mb-4">
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 font-sans">
                    ¿Eliminar documento?
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Bóveda Local
                  </p>
                </div>
              </div>

              <div className="text-sm text-slate-300 leading-relaxed font-sans mb-6">
                ¿Estás seguro de que deseas eliminar <strong className="text-slate-100">"{documents.find(d => d.id === docIdToDelete)?.title}"</strong>? Esta acción borrará el documento y todo su historial de chat asociado de forma permanente de tu almacenamiento local.
              </div>

              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => setDocIdToDelete(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl transition-all cursor-pointer"
                  id="btn-cancel-modal-delete"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDeleteDocument}
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-all shadow-lg shadow-rose-600/10 cursor-pointer"
                  id="btn-confirm-modal-delete"
                >
                  Eliminar permanentemente
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
