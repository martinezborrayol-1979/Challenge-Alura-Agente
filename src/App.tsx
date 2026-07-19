import React, { useState, useEffect, useRef } from "react";
import { INITIAL_DOCUMENTS } from "./initialDocuments";
import { DocumentItem, ChatMessage } from "./types";
import DocumentViewer from "./components/DocumentViewer";
import AiInsightsPanel from "./components/AiInsightsPanel";
import DocumentUploader from "./components/DocumentUploader";
import ComparePanel from "./components/ComparePanel";
import { useLanguage } from "./LanguageContext";
import { useToast } from "./ToastContext";
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
  Database,
  Languages,
  Sun,
  Moon,
  Lock,
  Unlock,
  Download,
  LayoutDashboard,
  ArrowRight,
  Upload,
  Eye
} from "lucide-react";

export default function App() {
  const { language, setLanguage, t } = useLanguage();
  const { showToast } = useToast();

  // Theme state: "dark" or "light" (high-contrast light)
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem("documind_theme");
    return (saved as "dark" | "light") || "dark";
  });

  // User Role state: "admin" (full read-write) or "viewer" (read-only)
  const [userRole, setUserRole] = useState<"admin" | "viewer">(() => {
    const saved = localStorage.getItem("documind_user_role");
    return (saved as "admin" | "viewer") || "admin";
  });

  useEffect(() => {
    localStorage.setItem("documind_user_role", userRole);
  }, [userRole]);

  useEffect(() => {
    localStorage.setItem("documind_theme", theme);
    const html = document.documentElement;
    if (theme === "light") {
      html.classList.add("light");
    } else {
      html.classList.remove("light");
    }
  }, [theme]);

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

  // RAG Optimization configurations (with localStorage persistence)
  const [chunkSize, setChunkSize] = useState<number>(() => {
    const saved = localStorage.getItem("documind_chunk_size");
    return saved ? parseInt(saved, 10) : 1000;
  });
  const [retrievalK, setRetrievalK] = useState<number>(() => {
    const saved = localStorage.getItem("documind_retrieval_k");
    return saved ? parseInt(saved, 10) : 3;
  });
  const [temperature, setTemperature] = useState<number>(() => {
    const saved = localStorage.getItem("documind_temperature");
    return saved ? parseFloat(saved) : 0.1;
  });
  const [useCache, setUseCache] = useState<boolean>(() => {
    const saved = localStorage.getItem("documind_use_cache");
    return saved !== "false";
  });
  
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
  const [mobileTab, setMobileTab] = useState<"document" | "ai">("document");
  const [docIdToDelete, setDocIdToDelete] = useState<string | null>(null);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [isBatchDeleteConfirmOpen, setIsBatchDeleteConfirmOpen] = useState(false);

  // Refs to prevent toast notifications on initial mounting
  const isMountedLanguage = useRef(false);
  const isMountedTheme = useRef(false);
  const isMountedRole = useRef(false);
  const isMountedChunkSize = useRef(false);
  const isMountedRetrievalK = useRef(false);
  const isMountedUseCache = useRef(false);
  const isMountedAiProvider = useRef(false);

  const [aiProvider, setAiProvider] = useState<"gemini" | "cohere">("gemini");
  const [apiKeysStatus, setApiKeysStatus] = useState({ hasGemini: true, hasCohere: false });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch("/api/config");
        if (res.ok) {
          const data = await res.json();
          setApiKeysStatus(data);
          if (!data.hasGemini && data.hasCohere) {
            setAiProvider("cohere");
          }
        }
      } catch (err) {
        console.error("Error fetching API config status:", err);
      }
    };
    fetchConfig();
  }, []);

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

  useEffect(() => {
    localStorage.setItem("documind_chunk_size", chunkSize.toString());
    if (!isMountedChunkSize.current) {
      isMountedChunkSize.current = true;
      return;
    }
    showToast(
      language === "es"
        ? `Tamaño de fragmento (Chunk Size) establecido a ${chunkSize} caracteres`
        : `Chunk size configured to ${chunkSize} characters`,
      "info"
    );
  }, [chunkSize]);

  useEffect(() => {
    localStorage.setItem("documind_retrieval_k", retrievalK.toString());
    if (!isMountedRetrievalK.current) {
      isMountedRetrievalK.current = true;
      return;
    }
    showToast(
      language === "es"
        ? `Límite de recuperación (Top K) establecido a K = ${retrievalK}`
        : `Retrieval limit (Top K) configured to K = ${retrievalK}`,
      "info"
    );
  }, [retrievalK]);

  useEffect(() => {
    localStorage.setItem("documind_temperature", temperature.toString());
  }, [temperature]);

  useEffect(() => {
    localStorage.setItem("documind_use_cache", useCache.toString());
    if (!isMountedUseCache.current) {
      isMountedUseCache.current = true;
      return;
    }
    showToast(
      useCache
        ? (language === "es" ? "Caché de LLM habilitada exitosamente" : "LLM caching successfully enabled")
        : (language === "es" ? "Caché de LLM deshabilitada" : "LLM caching disabled"),
      "info"
    );
  }, [useCache]);

  useEffect(() => {
    if (!isMountedLanguage.current) {
      isMountedLanguage.current = true;
      return;
    }
    showToast(
      language === "es"
        ? "Idioma cambiado a Español"
        : "Language changed to English",
      "success"
    );
  }, [language]);

  useEffect(() => {
    if (!isMountedTheme.current) {
      isMountedTheme.current = true;
      return;
    }
    showToast(
      theme === "dark"
        ? (language === "es" ? "Tema oscuro activado" : "Dark theme enabled")
        : (language === "es" ? "Contraste claro activado" : "Accessible light theme enabled"),
      "success"
    );
  }, [theme]);

  useEffect(() => {
    if (!isMountedRole.current) {
      isMountedRole.current = true;
      return;
    }
    showToast(
      userRole === "admin"
        ? (language === "es" ? "Acceso completo de Administrador habilitado" : "Full Administrator access enabled")
        : (language === "es" ? "Rol cambiado a Visor de solo lectura" : "Role changed to read-only Viewer"),
      "success"
    );
  }, [userRole]);

  useEffect(() => {
    if (!isMountedAiProvider.current) {
      isMountedAiProvider.current = true;
      return;
    }
    showToast(
      aiProvider === "gemini"
        ? (language === "es" ? "Cambiado al motor de Inteligencia Artificial Gemini" : "Switched to Gemini AI engine")
        : (language === "es" ? "Cambiado al motor de Inteligencia Artificial Cohere" : "Switched to Cohere AI engine"),
      "success"
    );
  }, [aiProvider]);

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
    showToast(
      language === "es"
        ? "Documento eliminado de la bóveda permanentemente"
        : "Document permanently deleted from vault",
      "success"
    );
  };

  // Clear selected doc IDs if role changes to viewer
  useEffect(() => {
    if (userRole === "viewer") {
      setSelectedDocIds([]);
    }
  }, [userRole]);

  const handleBatchExportMarkdown = () => {
    const selectedDocs = documents.filter((d) => selectedDocIds.includes(d.id));
    if (selectedDocs.length === 0) return;

    let md = `# ${language === "es" ? "Lote de Documentos Exportados" : "Exported Documents Batch"}\n`;
    md += `*${language === "es" ? "Fecha de Exportación" : "Export Date"}: ${new Date().toLocaleString()}*\n`;
    md += `*${language === "es" ? "Documentos seleccionados" : "Selected documents"}: ${selectedDocs.length}*\n\n`;
    md += `========================================\n\n`;

    selectedDocs.forEach((doc, idx) => {
      md += `## [${idx + 1}] ${doc.title}\n\n`;
      md += `- **${language === "es" ? "Categoría" : "Category"}:** ${doc.category}\n`;
      md += `- **${language === "es" ? "Creado" : "Created"}:** ${doc.createdAt}\n`;
      if (doc.tags && doc.tags.length > 0) {
        md += `- **Tags:** ${doc.tags.join(", ")}\n`;
      }
      md += `\n### ${language === "es" ? "Contenido" : "Content"}\n\n${doc.content}\n\n`;
      
      if (doc.executiveSummary) {
        md += `### ${language === "es" ? "Resumen Ejecutivo AI" : "AI Executive Summary"}\n\n${doc.executiveSummary}\n\n`;
      }
      
      md += `---\n\n`;
    });

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.setAttribute("download", `batch_export_${Date.now()}.md`);
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
    
    showToast(
      language === "es"
        ? `Se exportaron ${selectedDocs.length} documentos como Markdown`
        : `Exported ${selectedDocs.length} documents as Markdown`,
      "success"
    );
  };

  const handleBatchExportJson = () => {
    const selectedDocs = documents.filter((d) => selectedDocIds.includes(d.id));
    if (selectedDocs.length === 0) return;

    const dataStr = JSON.stringify(selectedDocs, null, 2);
    const blob = new Blob([dataStr], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.setAttribute("download", `batch_export_${Date.now()}.json`);
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);

    showToast(
      language === "es"
        ? `Se exportaron ${selectedDocs.length} documentos como JSON`
        : `Exported ${selectedDocs.length} documents as JSON`,
      "success"
    );
  };

  const handleBatchExportIndividual = () => {
    const selectedDocs = documents.filter((d) => selectedDocIds.includes(d.id));
    if (selectedDocs.length === 0) return;

    selectedDocs.forEach((doc, idx) => {
      setTimeout(() => {
        let md = `# ${doc.title}\n\n`;
        md += `**${language === "es" ? "Categoría" : "Category"}:** ${doc.category}\n`;
        md += `**${language === "es" ? "Fecha" : "Date"}:** ${doc.createdAt}\n\n`;
        md += `## ${language === "es" ? "Contenido" : "Content"}\n\n${doc.content}\n\n`;

        if (doc.executiveSummary) {
          md += `## ${language === "es" ? "Resumen Ejecutivo AI" : "AI Executive Summary"}\n\n${doc.executiveSummary}\n\n`;
        }

        if (doc.versions && doc.versions.length > 0) {
          md += `## ${language === "es" ? "Historial de Versiones" : "Version History"}\n\n`;
          doc.versions.forEach((v) => {
            md += `### ${v.timestamp} - ${v.changeSummary}\n\n${v.content}\n\n---\n\n`;
          });
        }

        const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = window.document.createElement("a");
        link.href = url;
        const safeTitle = (doc.title || "document").replace(/[^a-zA-Z0-9íóáúéñÍÓÁÚÉÑ]/g, "_").toLowerCase();
        link.setAttribute("download", `${safeTitle}.md`);
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
      }, idx * 150);
    });

    showToast(
      language === "es"
        ? `Descargando ${selectedDocs.length} archivos individualmente...`
        : `Downloading ${selectedDocs.length} files individually...`,
      "success"
    );
  };

  const handleConfirmBatchDelete = () => {
    if (selectedDocIds.length === 0) return;

    const remainingDocs = documents.filter((doc) => !selectedDocIds.includes(doc.id));
    setDocuments(remainingDocs);

    // Clear chats for deleted documents
    const updatedChats = { ...chatsByDoc };
    selectedDocIds.forEach((id) => {
      delete updatedChats[id];
    });
    setChatsByDoc(updatedChats);

    // Update activeDocId if active document was deleted
    if (selectedDocIds.includes(activeDocId)) {
      setActiveDocId(remainingDocs[0]?.id || "");
    }

    const countDeleted = selectedDocIds.length;
    setSelectedDocIds([]);
    setIsBatchDeleteConfirmOpen(false);

    showToast(
      language === "es"
        ? `Se eliminaron ${countDeleted} documentos de la bóveda permanentemente`
        : `Permanently deleted ${countDeleted} documents from the vault`,
      "success"
    );
  };

  // Handle content update (Inline Editing)
  const handleUpdateContent = (id: string, newContent: string, changeSummary?: string, updatedTags?: string[]) => {
    setDocuments((prevDocs) =>
      prevDocs.map((doc) => {
        if (doc.id !== id) return doc;
        
        const tagsChanged = updatedTags !== undefined && JSON.stringify(doc.tags || []) !== JSON.stringify(updatedTags);
        const contentChanged = doc.content !== newContent;

        if (!contentChanged && !tagsChanged) return doc;

        let existingVersions = doc.versions || [];
        if (contentChanged) {
          const timestampStr = new Date().toLocaleString("es-ES", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          });

          const newVersion = {
            id: `v-${Date.now()}`,
            content: doc.content,
            timestamp: timestampStr,
            title: doc.title,
            changeSummary: changeSummary || "Edición manual",
          };
          existingVersions = [newVersion, ...existingVersions];
        }

        return {
          ...doc,
          content: newContent,
          versions: existingVersions,
          tags: updatedTags !== undefined ? updatedTags : doc.tags,
        };
      })
    );

    showToast(
      language === "es"
        ? "¡Nueva versión guardada correctamente!"
        : "New version successfully saved!",
      "success"
    );
  };

  // Revert document to a specific version
  const handleRevertToVersion = (docId: string, versionId: string) => {
    setDocuments((prevDocs) =>
      prevDocs.map((doc) => {
        if (doc.id !== docId) return doc;
        const targetVersion = doc.versions?.find((v) => v.id === versionId);
        if (!targetVersion) return doc;

        const timestampStr = new Date().toLocaleString("es-ES", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });

        const currentVersion = {
          id: `v-${Date.now()}`,
          content: doc.content,
          timestamp: timestampStr,
          title: doc.title,
          changeSummary: `Antes de revertir a ${targetVersion.changeSummary}`,
        };

        const updatedVersions = doc.versions?.filter((v) => v.id !== versionId) || [];

        return {
          ...doc,
          content: targetVersion.content,
          versions: [currentVersion, ...updatedVersions],
        };
      })
    );

    showToast(
      language === "es"
        ? "¡Versión del documento restaurada correctamente!"
        : "Document version successfully restored!",
      "success"
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
          provider: aiProvider,
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

      showToast(
        language === "es"
          ? "¡Análisis AI generado exitosamente!"
          : "AI Analysis successfully generated!",
        "success"
      );
    } catch (err: any) {
      showToast(
        language === "es"
          ? `Error reanalizando el documento: ${err.message || "Fallo técnico"}`
          : `Error reanalyzing document: ${err.message || "Technical failure"}`,
        "error"
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle executive summary generation via Gemini API
  const handleGenerateExecutiveSummary = async (docId: string, lowLatency: boolean = true) => {
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
          lowLatency,
          provider: aiProvider,
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

      showToast(
        language === "es"
          ? "¡Resumen ejecutivo generado correctamente!"
          : "Executive summary successfully generated!",
        "success"
      );
    } catch (err: any) {
      showToast(
        language === "es"
          ? `Error al generar el resumen ejecutivo: ${err.message || "Fallo técnico"}`
          : `Error generating executive summary: ${err.message || "Technical failure"}`,
        "error"
      );
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // Handle custom interactive Q&A (Contextual Chat)
  const handleSendMessage = async (
    docId: string, 
    messageText: string, 
    lowLatency: boolean = true,
    technique: "standard" | "cot" | "cove" = "standard",
    useSearchGrounding: boolean = false
  ) => {
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
    const newChatsMap = {
      ...chatsByDoc,
      [docId]: updatedChatsWithUser,
    };
    setChatsByDoc(newChatsMap);
    localStorage.setItem("documind_chats", JSON.stringify(newChatsMap));

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
          lowLatency,
          provider: aiProvider,
          promptTechnique: technique,
          category: targetDoc.category,
          role: userRole,
          chunkSize,
          retrievalK,
          temperature,
          useCache,
          useSearchGrounding,
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
        metrics: data.metrics,
        guardrails: data.guardrails,
        thinkingProcess: data.thinkingProcess,
        promptTechnique: technique,
        searchSources: data.searchSources,
      };

      const finalChatsMap = {
        ...chatsByDoc,
        [docId]: [...updatedChatsWithUser, assistantMessage],
      };
      setChatsByDoc(finalChatsMap);
      localStorage.setItem("documind_chats", JSON.stringify(finalChatsMap));
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: "msg-err-" + Date.now(),
        role: "assistant",
        content: `Error al contactar a ${aiProvider === "cohere" ? "Cohere" : "Gemini"}: ${err.message || "Revisa la conexión de red."}`,
        timestamp: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
      };
      const errorChatsMap = {
        ...chatsByDoc,
        [docId]: [...updatedChatsWithUser, errorMessage],
      };
      setChatsByDoc(errorChatsMap);
      localStorage.setItem("documind_chats", JSON.stringify(errorChatsMap));
    } finally {
      setIsChatLoading(false);
    }
  };

  // Handle user feedback loop (Thumbs Up / Down + Audit comments)
  const handleSaveFeedback = async (messageId: string, liked: boolean, comment?: string) => {
    if (!activeDoc) return;
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messageId,
          docId: activeDoc.id,
          liked,
          comment,
        }),
      });
      
      if (response.ok) {
        // Update local chats state and persist to localStorage
        const docChats = chatsByDoc[activeDoc.id] || [];
        const updated = docChats.map((msg) => {
          if (msg.id === messageId) {
            return {
              ...msg,
              feedback: {
                liked,
                comment: comment !== undefined ? comment : msg.feedback?.comment || "",
              },
            };
          }
          return msg;
        });
        
        const newChatsMap = {
          ...chatsByDoc,
          [activeDoc.id]: updated,
        };
        setChatsByDoc(newChatsMap);
        localStorage.setItem("documind_chats", JSON.stringify(newChatsMap));
        
        showToast(
          language === "es"
            ? "¡Retroalimentación guardada exitosamente!"
            : "Feedback successfully saved!",
          "success"
        );
      }
    } catch (err) {
      console.error("Error saving feedback:", err);
    }
  };

  // Filter documents based on Search Input & Category selections
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.tags && doc.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));
    
    const matchesCategory =
      selectedCategory === "Todos" || doc.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const activeDoc = documents.find((doc) => doc.id === activeDocId);

  useEffect(() => {
    if (activeDoc) {
      setMobileTab("document");
    }
  }, [activeDoc?.id]);

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
                  {t("app.title")}
                </h1>
                <span className="text-[10px] text-indigo-400 font-bold font-mono tracking-wider block -mt-0.5 uppercase">
                  {t("app.subtitle")}
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

          {/* Repository Stats Block */}
          <div className="flex flex-col gap-2">
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">{language === "es" ? "Bóveda Segura" : "Secure Vault"}</span>
              <span className="font-mono text-indigo-400 font-bold bg-indigo-950/40 px-2.5 py-0.5 rounded-lg border border-indigo-900/30">
                {documents.length} {language === "es" ? "Docs" : "Docs"}
              </span>
            </div>
            
            <button
              onClick={() => {
                setActiveDocId("");
                setActiveView("viewer");
              }}
              className={`w-full py-2 px-3 rounded-xl border font-sans text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeView === "viewer" && !activeDocId
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/15"
                  : "bg-slate-950/40 text-slate-300 border-slate-800/80 hover:bg-slate-800/80 hover:text-white"
              }`}
              id="btn-sidebar-dashboard"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>{language === "es" ? "Inicio de la Bóveda" : "Vault Dashboard"}</span>
            </button>
          </div>
        </div>

        {/* Categories Quick Filter tab list */}
        <div className="px-5 py-3 border-b border-slate-800/80 bg-slate-950/20">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block mb-2">
            {language === "es" ? "Categorías" : "Categories"}
          </span>
          <div className="flex flex-wrap gap-1">
            {["Todos", "Financiero", "Legal", "Técnico", "Recursos Humanos"].map((cat) => {
              const isSelected = selectedCategory === cat;
              let displayLabel = cat;
              if (cat === "Todos") displayLabel = t("category.all");
              else if (cat === "Financiero") displayLabel = t("category.financial");
              else if (cat === "Legal") displayLabel = t("category.legal");
              else if (cat === "Técnico") displayLabel = t("category.technical");
              else if (cat === "Recursos Humanos" || cat === "Personal") displayLabel = t("category.hr");

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
                  <span>{displayLabel}</span>
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
              placeholder={t("search.placeholder")}
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

          {/* Batch Actions Panel */}
          {userRole === "admin" && selectedDocIds.length > 0 && (
            <div 
              className="mb-3.5 p-3 bg-indigo-950/30 border border-indigo-800/40 rounded-xl flex flex-col gap-2.5 animate-in slide-in-from-top-2 duration-200"
              id="batch-actions-panel"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 bg-indigo-600 text-white rounded-md text-[10px] font-bold font-mono">
                    {selectedDocIds.length}
                  </span>
                  <span className="text-[11px] font-semibold text-indigo-200">
                    {language === "es" ? "seleccionados" : "selected"}
                  </span>
                </div>
                
                <button
                  onClick={() => setSelectedDocIds([])}
                  className="text-[10px] font-bold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  id="btn-clear-selection"
                >
                  {language === "es" ? "Limpiar" : "Clear"}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 relative">
                {/* Export Options dropdown or button */}
                <div className="relative group/batch-export">
                  <button
                    className="w-full bg-slate-950 hover:bg-slate-900 text-emerald-400 py-1.5 px-2.5 rounded-lg font-bold text-[11px] border border-slate-800 hover:border-emerald-500/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    id="btn-batch-export"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{language === "es" ? "Exportar" : "Export"}</span>
                  </button>
                  
                  {/* Hover dropdown for export choices */}
                  <div className="absolute left-0 right-0 mt-1 bg-slate-950 border border-slate-800 rounded-lg shadow-xl hidden group-hover/batch-export:block hover:block z-40 p-1 space-y-0.5">
                    <button
                      onClick={handleBatchExportMarkdown}
                      className="w-full text-left px-2 py-1.5 text-[10px] font-medium text-slate-300 hover:bg-slate-900 hover:text-emerald-400 rounded-md transition-colors cursor-pointer"
                      id="btn-batch-export-md"
                    >
                      📄 {language === "es" ? "Markdown (.md)" : "Markdown (.md)"}
                    </button>
                    <button
                      onClick={handleBatchExportJson}
                      className="w-full text-left px-2 py-1.5 text-[10px] font-medium text-slate-300 hover:bg-slate-900 hover:text-emerald-400 rounded-md transition-colors cursor-pointer"
                      id="btn-batch-export-json"
                    >
                      📦 {language === "es" ? "JSON (.json)" : "JSON (.json)"}
                    </button>
                    <button
                      onClick={handleBatchExportIndividual}
                      className="w-full text-left px-2 py-1.5 text-[10px] font-medium text-slate-300 hover:bg-slate-900 hover:text-emerald-400 rounded-md transition-colors cursor-pointer"
                      id="btn-batch-export-indiv"
                    >
                      📥 {language === "es" ? "Por separado" : "Separately"}
                    </button>
                  </div>
                </div>

                {/* Batch Delete button */}
                <button
                  onClick={() => setIsBatchDeleteConfirmOpen(true)}
                  className="bg-red-950/30 hover:bg-red-600 text-red-400 hover:text-white py-1.5 px-2.5 rounded-lg font-bold text-[11px] border border-red-900/30 hover:border-red-500/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  id="btn-batch-delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{language === "es" ? "Eliminar" : "Delete"}</span>
                </button>
              </div>
            </div>
          )}

          {/* List Header with Select All option */}
          <div className="flex items-center justify-between mb-2 px-1 shrink-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block">
              {language === "es" ? "Archivos del Repositorio" : "Repository Files"} ({filteredDocuments.length})
            </span>
            
            {userRole === "admin" && filteredDocuments.length > 0 && (
              <button
                onClick={() => {
                  const allVisibleIds = filteredDocuments.map((doc) => doc.id);
                  const isAllSelected = allVisibleIds.every((id) => selectedDocIds.includes(id));
                  if (isAllSelected) {
                    // Deselect all visible
                    setSelectedDocIds((prev) => prev.filter((id) => !allVisibleIds.includes(id)));
                  } else {
                    // Select all visible
                    setSelectedDocIds((prev) => {
                      const newSelection = [...prev];
                      allVisibleIds.forEach((id) => {
                        if (!newSelection.includes(id)) {
                          newSelection.push(id);
                        }
                      });
                      return newSelection;
                    });
                  }
                }}
                className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors font-sans cursor-pointer"
                id="btn-select-all-filtered"
              >
                {filteredDocuments.every((doc) => selectedDocIds.includes(doc.id))
                  ? (language === "es" ? "Deseleccionar todo" : "Deselect All")
                  : (language === "es" ? "Seleccionar todo" : "Select All")}
              </button>
            )}
          </div>

          {/* Document scroll container */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {filteredDocuments.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs font-mono">
                {t("search.no_docs")}
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
                    {userRole === "admin" && (
                      <div 
                        className="flex items-center h-5 mr-2.5 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selectedDocIds.includes(doc.id)}
                          onChange={() => {
                            setSelectedDocIds((prev) =>
                              prev.includes(doc.id)
                                ? prev.filter((id) => id !== doc.id)
                                : [...prev, doc.id]
                            );
                          }}
                          className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer accent-indigo-600"
                          id={`checkbox-select-doc-${doc.id}`}
                        />
                      </div>
                    )}

                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {getCategoryIcon(doc.category)}
                        <h3 className="text-xs font-bold text-slate-200 truncate font-sans flex-1 min-w-0">
                          {doc.title}
                        </h3>
                        <span className="shrink-0 text-[9px] font-mono font-bold px-1.5 py-0.5 bg-slate-950 border border-slate-800 text-indigo-400 rounded-md" title={`Versión actual: v${(doc.versions?.length || 0) + 1}.0`}>
                          v{(doc.versions?.length || 0) + 1}.0
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[9px] text-slate-500 font-mono">
                          {new Date(doc.createdAt).toLocaleDateString(language === "es" ? "es-MX" : "en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <span className="text-[8px] text-slate-500">•</span>
                        <span className="text-[9px] font-semibold text-indigo-400">
                          {doc.category === "Financiero" ? t("category.financial") :
                           doc.category === "Legal" ? t("category.legal") :
                           doc.category === "Técnico" ? t("category.technical") :
                           doc.category === "Recursos Humanos" ? t("category.hr") : doc.category}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Trash Delete button */}
                      {userRole === "admin" && (
                        <button
                          onClick={(e) => handleDeleteDocument(doc.id, e)}
                          className="opacity-40 hover:opacity-100 group-hover:opacity-100 p-1 hover:bg-red-950/50 text-slate-400 hover:text-red-400 rounded-md transition-all cursor-pointer"
                          title={language === "es" ? "Eliminar documento" : "Delete document"}
                          id={`btn-delete-sidebar-${doc.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

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
            {t("btn.new_doc")}
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
            {t("btn.compare_docs")}
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
              <span>{t("app.vault_path")}</span>
              <span>/</span>
              <span className="text-slate-100 font-bold">
                {activeView === "viewer" ? t("view.viewer") : activeView === "upload" ? t("view.upload") : t("view.compare")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold">
            {/* Warning when active engine key is missing */}
            {aiProvider === "cohere" && !apiKeysStatus.hasCohere && (
              <div className="hidden lg:flex items-center gap-1 px-3 py-1.5 bg-amber-950/40 border border-amber-900/45 text-[10px] text-amber-400 rounded-full font-mono font-semibold animate-pulse" id="warning-missing-cohere-key">
                ⚠️ {t("warning.cohere")}
              </div>
            )}
            {aiProvider === "gemini" && !apiKeysStatus.hasGemini && (
              <div className="hidden lg:flex items-center gap-1 px-3 py-1.5 bg-amber-950/40 border border-amber-900/45 text-[10px] text-amber-400 rounded-full font-mono font-semibold animate-pulse" id="warning-missing-gemini-key">
                ⚠️ {t("warning.gemini")}
              </div>
            )}

            {/* Language Selector */}
            <div className="flex items-center gap-0.5 bg-slate-950 border border-slate-800 rounded-2xl p-0.5 shrink-0" id="language-selector" title={language === "es" ? "Cambiar idioma" : "Change language"}>
              <button
                onClick={() => setLanguage("es")}
                className={`px-2 py-1 rounded-xl font-sans text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  language === "es"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                id="btn-lang-es"
              >
                <span>ES</span>
              </button>
              <button
                onClick={() => setLanguage("en")}
                className={`px-2 py-1 rounded-xl font-sans text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  language === "en"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                id="btn-lang-en"
              >
                <span>EN</span>
              </button>
            </div>

            {/* Accessibility Theme Selector (Dark vs High-Contrast Light) */}
            <div className="flex items-center gap-0.5 bg-slate-950 border border-slate-800 rounded-2xl p-0.5 shrink-0" id="theme-selector" title={language === "es" ? "Cambiar contraste" : "Change contrast"}>
              <button
                onClick={() => setTheme("dark")}
                className={`px-2 py-1 rounded-xl font-sans text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  theme === "dark"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                id="btn-theme-dark"
                title={language === "es" ? "Tema oscuro actual" : "Current dark theme"}
              >
                <Moon className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">{language === "es" ? "OSCURO" : "DARK"}</span>
              </button>
              <button
                onClick={() => setTheme("light")}
                className={`px-2 py-1 rounded-xl font-sans text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  theme === "light"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                id="btn-theme-light"
                title={language === "es" ? "Contraste claro alto para accesibilidad" : "High contrast light theme for accessibility"}
              >
                <Sun className="w-3.5 h-3.5 animate-pulse" />
                <span className="hidden xl:inline">{language === "es" ? "ACCESIBLE" : "ACCESSIBLE"}</span>
              </button>
            </div>

            {/* AI Engine Global Selector */}
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-2xl p-0.5 shrink-0" id="global-ai-selector">
              <button
                onClick={() => setAiProvider("gemini")}
                className={`px-2.5 py-1 rounded-xl font-sans text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  aiProvider === "gemini"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title={apiKeysStatus.hasGemini ? "Google Gemini" : language === "es" ? "Falta la clave GEMINI_API_KEY" : "Missing GEMINI_API_KEY"}
                id="btn-select-gemini"
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Gemini</span>
                {!apiKeysStatus.hasGemini && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse ml-0.5" />
                )}
              </button>
              
              <button
                onClick={() => setAiProvider("cohere")}
                className={`px-2.5 py-1 rounded-xl font-sans text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  aiProvider === "cohere"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title={apiKeysStatus.hasCohere ? "Cohere Command" : language === "es" ? "Falta la clave COHERE_API_KEY" : "Missing COHERE_API_KEY"}
                id="btn-select-cohere"
              >
                <Cpu className="w-3.5 h-3.5 shrink-0" />
                <span>Cohere</span>
                {!apiKeysStatus.hasCohere && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse ml-0.5" />
                )}
              </button>
            </div>
            
            {/* Interactive User Role Selector */}
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-2xl p-0.5 shrink-0" id="user-role-selector">
              <button
                onClick={() => setUserRole("admin")}
                className={`px-2.5 py-1 rounded-xl font-sans text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  userRole === "admin"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                id="btn-select-role-admin"
                title={language === "es" ? "Acceso Administrativo Completo" : "Full Administrative Access"}
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>ADMIN</span>
              </button>
              <button
                onClick={() => setUserRole("viewer")}
                className={`px-2.5 py-1 rounded-xl font-sans text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  userRole === "viewer"
                    ? "bg-rose-900 text-white shadow-md shadow-rose-900/10"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                id="btn-select-role-viewer"
                title={language === "es" ? "Rol de Solo Lectura (Sin cambios)" : "Read-Only Role (No changes)"}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{language === "es" ? "VISOR" : "VIEWER"}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable View Area container */}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {activeView === "viewer" ? (
              activeDoc ? (
                <motion.div
                  key={`viewer-${activeDoc.id}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="h-full flex flex-col p-4 md:p-6 gap-4 overflow-hidden"
                >
                  {/* Mobile/Tablet Tab Selector */}
                  {!isFocusMode && (
                    <div className="lg:hidden flex items-center bg-slate-900 border border-slate-800 rounded-2xl p-1 shrink-0 shadow-inner">
                      <button
                        onClick={() => setMobileTab("document")}
                        className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          mobileTab === "document"
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <FileText className="w-4 h-4" />
                        <span>{language === "es" ? "Documento" : "Document"}</span>
                      </button>
                      <button
                        onClick={() => setMobileTab("ai")}
                        className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          mobileTab === "ai"
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <Brain className="w-4 h-4" />
                        <span>{language === "es" ? "Asistente AI" : "AI Assistant"}</span>
                      </button>
                    </div>
                  )}

                  {/* Columns Container */}
                  <div className="flex-1 flex flex-col lg:flex-row gap-4 lg:gap-6 overflow-hidden min-h-0">
                    {/* Left panel: Original Document Viewer */}
                    <div className={`flex-grow h-full min-h-0 ${isFocusMode || mobileTab === "document" ? "block" : "hidden lg:block"}`}>
                      <DocumentViewer
                        document={activeDoc}
                        onUpdateContent={handleUpdateContent}
                        onTriggerReanalyze={handleTriggerReanalyze}
                        isAnalyzing={isAnalyzing}
                        isFocusMode={isFocusMode}
                        onToggleFocusMode={() => setIsFocusMode(!isFocusMode)}
                        onDeleteDocument={handleDeleteDocument}
                        onRevertToVersion={handleRevertToVersion}
                        userRole={userRole}
                        provider={aiProvider}
                      />
                    </div>

                    {/* Right panel: AI Cognitive Insights & Chat */}
                    {!isFocusMode && (
                      <div className={`w-full lg:w-[420px] xl:w-[460px] h-full shrink-0 flex flex-col min-h-0 animate-in fade-in duration-300 ${mobileTab === "ai" ? "flex" : "hidden lg:flex"}`}>
                        <AiInsightsPanel
                          document={activeDoc}
                          chats={activeDocChats}
                          onSendMessage={handleSendMessage}
                          isChatLoading={isChatLoading}
                          isAnalyzing={isAnalyzing}
                          onGenerateExecutiveSummary={handleGenerateExecutiveSummary}
                          isGeneratingSummary={isGeneratingSummary}
                          provider={aiProvider}
                          userRole={userRole}
                          onSaveFeedback={handleSaveFeedback}
                          chunkSize={chunkSize}
                          setChunkSize={setChunkSize}
                          retrievalK={retrievalK}
                          setRetrievalK={setRetrievalK}
                          temperature={temperature}
                          setTemperature={setTemperature}
                          useCache={useCache}
                          setUseCache={setUseCache}
                        />
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="viewer-empty-state"
                  initial={{ opacity: 0, scale: 0.98, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: -12 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="h-full w-full p-6 overflow-y-auto flex flex-col justify-between"
                  id="vault-dashboard-empty-state"
                >
                  <div className="max-w-4xl mx-auto w-full my-auto py-8">
                    {/* Header Welcomer */}
                    <div className="text-center mb-10">
                      <div className="inline-flex p-3.5 bg-indigo-600/10 border border-indigo-500/25 text-indigo-400 rounded-3xl mb-4 shadow-lg shadow-indigo-500/5 animate-pulse">
                        <Brain className="w-8 h-8" />
                      </div>
                      <h2 className="text-2xl font-black text-slate-100 tracking-tight sm:text-3xl font-sans">
                        {language === "es" ? "Bóveda Inteligente DocuMind" : "DocuMind Intelligent Vault"}
                      </h2>
                      <p className="mt-2.5 text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
                        {language === "es" 
                          ? "No hay ningún documento activo seleccionado. Selecciona un archivo del repositorio lateral o sigue la guía interactiva a continuación."
                          : "No active document is selected. Choose a file from the repository sidebar or follow the interactive guide below."}
                      </p>
                    </div>

                    {/* Bento Quick Start Guide */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                      {/* Step 1: Upload Document */}
                      <div 
                        onClick={() => setActiveView("upload")}
                        className="bg-slate-900 border border-slate-800/80 hover:border-indigo-500/30 rounded-2xl p-5 transition-all duration-300 group cursor-pointer shadow-xl relative overflow-hidden flex flex-col justify-between"
                      >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-500/5 to-transparent pointer-events-none" />
                        <div>
                          <div className="flex items-center justify-between mb-3.5">
                            <div className="p-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl">
                              <Upload className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] font-bold font-mono text-indigo-400 uppercase tracking-widest px-2 py-0.5 bg-indigo-950/40 border border-indigo-900/30 rounded-md">
                              {language === "es" ? "Paso 1" : "Step 1"}
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-slate-200 group-hover:text-indigo-400 transition-colors font-sans flex items-center gap-1.5">
                            {language === "es" ? "Cargar Nuevo Documento" : "Upload New Document"}
                          </h3>
                          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                            {language === "es"
                              ? "Importa archivos de texto o código en el repositorio seguro para inicializar el análisis y la indexación semántica RAG."
                              : "Import text or code files into the secure repository to initialize analysis and semantic RAG indexing."}
                          </p>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs font-bold text-indigo-400 group-hover:translate-x-1 transition-transform">
                          <span>{language === "es" ? "Ir al cargador" : "Go to uploader"}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </div>

                      {/* Step 2: Select Document */}
                      <div 
                        onClick={() => {
                          if (documents.length > 0) {
                            setActiveDocId(documents[0].id);
                            showToast(
                              language === "es"
                                ? `Cargando el documento: ${documents[0].title}`
                                : `Loading document: ${documents[0].title}`,
                              "info"
                            );
                          } else {
                            showToast(
                              language === "es"
                                ? "Carga un documento primero"
                                : "Please upload a document first",
                              "warning"
                            );
                          }
                        }}
                        className="bg-slate-900 border border-slate-800/80 hover:border-emerald-500/30 rounded-2xl p-5 transition-all duration-300 group cursor-pointer shadow-xl relative overflow-hidden flex flex-col justify-between"
                      >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-500/5 to-transparent pointer-events-none" />
                        <div>
                          <div className="flex items-center justify-between mb-3.5">
                            <div className="p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
                              <FileText className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] font-bold font-mono text-emerald-400 uppercase tracking-widest px-2 py-0.5 bg-emerald-950/40 border border-emerald-900/30 rounded-md">
                              {language === "es" ? "Paso 2" : "Step 2"}
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-slate-200 group-hover:text-emerald-400 transition-colors font-sans">
                            {language === "es" ? "Explorar Repositorio" : "Explore Repository"}
                          </h3>
                          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                            {language === "es"
                              ? "Selecciona un documento de la lista lateral para iniciar el chat con IA contextual, inspeccionar versiones o regenerar resúmenes."
                              : "Select a document from the sidebar list to start contextual AI chat, inspect history versions, or regenerate summaries."}
                          </p>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs font-bold text-emerald-400 group-hover:translate-x-1 transition-transform">
                          <span>
                            {documents.length > 0 
                              ? (language === "es" ? `Cargar: ${documents[0].title}` : `Load: ${documents[0].title}`)
                              : (language === "es" ? "Selecciona de la lista" : "Select from list")}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </div>

                      {/* Step 3: Compare Side-by-Side */}
                      <div 
                        onClick={() => setActiveView("compare")}
                        className="bg-slate-900 border border-slate-800/80 hover:border-amber-500/30 rounded-2xl p-5 transition-all duration-300 group cursor-pointer shadow-xl relative overflow-hidden flex flex-col justify-between"
                      >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-500/5 to-transparent pointer-events-none" />
                        <div>
                          <div className="flex items-center justify-between mb-3.5">
                            <div className="p-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl">
                              <ArrowLeftRight className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] font-bold font-mono text-amber-400 uppercase tracking-widest px-2 py-0.5 bg-amber-950/40 border border-amber-900/30 rounded-md">
                              {language === "es" ? "Paso 3" : "Step 3"}
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-slate-200 group-hover:text-amber-400 transition-colors font-sans">
                            {language === "es" ? "Comparación Diferencial" : "Differential Comparison"}
                          </h3>
                          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                            {language === "es"
                              ? "Utiliza la herramienta de comparación avanzada para analizar versiones de documentos y cambios de texto línea por línea."
                              : "Use the advanced comparison tool to analyze document variations and trace differences line-by-line."}
                          </p>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs font-bold text-amber-400 group-hover:translate-x-1 transition-transform">
                          <span>{language === "es" ? "Ir al comparador" : "Go to comparison"}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </div>

                      {/* Step 4: Toggle Audit Roles */}
                      <div 
                        onClick={() => {
                          const nextRole = userRole === "admin" ? "viewer" : "admin";
                          setUserRole(nextRole);
                        }}
                        className="bg-slate-900 border border-slate-800/80 hover:border-rose-500/30 rounded-2xl p-5 transition-all duration-300 group cursor-pointer shadow-xl relative overflow-hidden flex flex-col justify-between"
                      >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-rose-500/5 to-transparent pointer-events-none" />
                        <div>
                          <div className="flex items-center justify-between mb-3.5">
                            <div className="p-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl">
                              {userRole === "admin" ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                            </div>
                            <span className="text-[10px] font-bold font-mono text-rose-400 uppercase tracking-widest px-2 py-0.5 bg-rose-950/40 border border-rose-900/30 rounded-md">
                              {language === "es" ? "Paso 4" : "Step 4"}
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-slate-200 group-hover:text-rose-400 transition-colors font-sans">
                            {language === "es" ? "Políticas de Cumplimiento" : "Compliance & Roles"}
                          </h3>
                          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                            {language === "es"
                              ? `Cambia el rol a ${userRole === "admin" ? "VISOR" : "ADMIN"} en el selector superior para verificar el comportamiento de lectura y escritura.`
                              : `Toggle role to ${userRole === "admin" ? "VIEWER" : "ADMIN"} in the header selector to verify read/write permission compliance.`}
                          </p>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs font-bold text-rose-400 group-hover:translate-x-1 transition-transform">
                          <span>
                            {language === "es" 
                              ? `Cambiar a ${userRole === "admin" ? "Visor" : "Administrador"}`
                              : `Switch to ${userRole === "admin" ? "Viewer" : "Administrator"}`}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>

                    {/* Dashboard Statistics Footnote */}
                    <div className="p-4 bg-slate-900/40 border border-slate-800/60 rounded-2xl flex flex-wrap gap-6 items-center justify-between text-xs font-sans text-slate-400">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>
                          {language === "es" ? "Estado de la Bóveda" : "Vault Status"}: <strong>{language === "es" ? "Operativo" : "Operational"}</strong>
                        </span>
                      </div>
                      
                      <div className="flex gap-4">
                        <span>
                          {language === "es" ? "Motor IA" : "AI Engine"}: <strong className="text-indigo-400 font-mono">{aiProvider === "gemini" ? "Gemini 1.5 Flash" : "Cohere Command"}</strong>
                        </span>
                        <span className="text-slate-700">|</span>
                        <span>
                          {language === "es" ? "Cache LLM" : "LLM Cache"}: <strong className={useCache ? "text-emerald-400" : "text-amber-500"}>{useCache ? (language === "es" ? "Activa" : "Active") : (language === "es" ? "Inactiva" : "Inactive")}</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
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
                    userRole={userRole}
                    aiProvider={aiProvider}
                    onAddDocument={(newDoc) => {
                      setDocuments([newDoc, ...documents]);
                      setActiveDocId(newDoc.id);
                      setActiveView("viewer");
                      showToast(
                        language === "es"
                          ? "¡Documento cargado y analizado correctamente!"
                          : "Document successfully uploaded and analyzed!",
                        "success"
                      );
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
                    provider={aiProvider}
                    onCancel={() => setActiveView("viewer")}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Elegant Custom Batch Deletion Confirmation Modal */}
      <AnimatePresence>
        {isBatchDeleteConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden"
              id="confirm-batch-delete-modal"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-rose-500/5 to-transparent pointer-events-none" />
              
              <div className="flex items-center gap-3.5 mb-4">
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 font-sans">
                    {language === "es" ? "Eliminar lote de documentos" : "Delete Batch of Documents"}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {language === "es" ? "Operación por Lote" : "Batch Operation"}
                  </p>
                </div>
              </div>

              <div className="text-sm text-slate-300 leading-relaxed font-sans mb-6">
                {language === "es" ? (
                  <>¿Estás seguro de que deseas eliminar los <strong className="text-rose-400 font-mono font-bold">{selectedDocIds.length}</strong> documentos seleccionados? Esta acción los borrará permanentemente junto con su historial de chat asociado de tu almacenamiento local.</>
                ) : (
                  <>Are you sure you want to delete the <strong className="text-rose-400 font-mono font-bold">{selectedDocIds.length}</strong> selected documents? This action will permanently erase them along with all associated chat histories from your local storage.</>
                )}
                
                {/* List names of selected docs */}
                <div className="mt-3 max-h-24 overflow-y-auto border border-slate-800/80 rounded-xl p-2 bg-slate-950/40 text-xs text-slate-400 space-y-1">
                  {documents.filter(d => selectedDocIds.includes(d.id)).map(d => (
                    <div key={d.id} className="truncate">• {d.title}</div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => setIsBatchDeleteConfirmOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl transition-all cursor-pointer"
                  id="btn-cancel-batch-delete"
                >
                  {t("delete.cancel")}
                </button>
                <button
                  onClick={handleConfirmBatchDelete}
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-all shadow-lg shadow-rose-600/10 cursor-pointer"
                  id="btn-confirm-batch-delete"
                >
                  {language === "es" ? `Eliminar ${selectedDocIds.length}` : `Delete ${selectedDocIds.length}`}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                    {t("delete.title")}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {language === "es" ? "Bóveda Local" : "Local Vault"}
                  </p>
                </div>
              </div>

              <div className="text-sm text-slate-300 leading-relaxed font-sans mb-6">
                {language === "es" ? (
                  <>¿Estás seguro de que deseas eliminar <strong className="text-slate-100">"{documents.find(d => d.id === docIdToDelete)?.title}"</strong>? Esta acción borrará el documento y todo su historial de chat asociado de forma permanente de tu almacenamiento local.</>
                ) : (
                  <>Are you sure you want to delete <strong className="text-slate-100">"{documents.find(d => d.id === docIdToDelete)?.title}"</strong>? This action will permanently erase the document and all associated chat history from your local storage.</>
                )}
              </div>

              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => setDocIdToDelete(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl transition-all cursor-pointer"
                  id="btn-cancel-modal-delete"
                >
                  {t("delete.cancel")}
                </button>
                <button
                  onClick={confirmDeleteDocument}
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-all shadow-lg shadow-rose-600/10 cursor-pointer"
                  id="btn-confirm-modal-delete"
                >
                  {language === "es" ? "Eliminar permanentemente" : "Delete permanently"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
