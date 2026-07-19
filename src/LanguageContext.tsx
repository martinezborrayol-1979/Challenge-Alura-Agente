import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "es" | "en";

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

const translations: Record<Language, Record<string, string>> = {
  es: {
    // App & Navbar
    "app.title": "DocuMind AI",
    "app.subtitle": "Suite Cognitiva Bento",
    "app.synced": "Sincronizados",
    "app.clock_title": "Hora Local (México)",
    "app.vault_path": "Vault: /secure_env",
    "app.admin_role": "Administrador de la Bóveda",
    "app.vault_status": "Bóveda Segura Operativa",
    "view.viewer": "Visualizador e Insights",
    "view.upload": "Ingesta de Documentos",
    "view.compare": "Comparador de Bóveda",
    "btn.new_doc": "Ingresar Documento",
    "btn.compare_docs": "Comparación Cruzada AI",
    "warning.gemini": "Configura la clave GEMINI_API_KEY",
    "warning.cohere": "Agrega COHERE_API_KEY en .env",
    
    // Category Names
    "category.all": "Todos",
    "category.financial": "Financiero",
    "category.legal": "Legal",
    "category.technical": "Técnico",
    "category.personal": "Personal",
    "category.hr": "Recursos Humanos",
    
    // Search
    "search.placeholder": "Buscar documentos...",
    "search.no_docs": "No se encontraron documentos",
    
    // Deletion Modal
    "delete.title": "Eliminar Documento",
    "delete.confirm_msg": "¿Estás seguro de que deseas eliminar este documento permanentemente?",
    "delete.warning": "Esta acción no se puede deshacer.",
    "delete.action": "Eliminar",
    "delete.cancel": "Cancelar",

    // Document Viewer
    "viewer.readability_analysis": "Análisis de Legibilidad",
    "viewer.words": "Palabras",
    "viewer.sentences": "Oraciones",
    "viewer.syllables": "Sílabas",
    "viewer.flesch_score": "Índice de Flesch-Kincaid",
    "viewer.reading_level": "Nivel de Lectura",
    "viewer.reading_level.very_easy": "Muy Fácil",
    "viewer.reading_level.easy": "Fácil",
    "viewer.reading_level.standard": "Estándar",
    "viewer.reading_level.difficult": "Difícil",
    "viewer.reading_level.very_difficult": "Muy Difícil",
    "viewer.category": "Categoría",
    "viewer.created": "Creado",
    "viewer.current_version": "Versión Actual",
    "viewer.version_num": "Versión",
    
    // Viewer Buttons & Tooltips
    "btn.edit": "Editar",
    "btn.focus_mode": "Modo Enfoque",
    "btn.exit_focus": "Salir de Enfoque",
    "btn.download": "Descargar",
    "btn.reanalyze": "Reanalizar",
    "btn.saving": "Guardando...",
    "btn.save_version": "Guardar Versión",
    "btn.cancel_edit": "Cancelar",
    "placeholder.change_summary": "Resumen de cambios (ej. Corrección de cláusula 4)...",
    "placeholder.doc_content": "Escribe el contenido de tu documento...",
    
    // Version History
    "history.title": "Historial de Versiones",
    "history.previewing": "Vista Previa de la Versión",
    "history.restore": "Restaurar",
    "history.return_editor": "Volver al Editor",
    "history.no_summary": "Sin resumen de cambios",
    "history.preview_warning": "Estás previsualizando una versión anterior del documento.",
    "history.empty": "No hay versiones registradas para este documento en la bóveda local.",
    "history.table.ver": "Versión",
    "history.table.date": "Fecha/Hora",
    "history.table.summary": "Resumen de Cambios",
    "history.table.title": "Título del Documento",

    // AI Insights Panel
    "risk.high": "Riesgo Alto",
    "risk.moderate": "Riesgo Moderado",
    "risk.low": "Riesgo Bajo",
    "tab.analysis": "Análisis AI",
    "tab.chat": "Preguntas AI",
    "insights.cognitive_summary": "Resumen Cognitivo",
    "insights.key_clauses": "Cláusulas Clave y Entidades",
    "insights.risk_analysis": "Análisis de Riesgo o Enfoque",
    "insights.no_analysis": "Sin análisis generado",
    "insights.click_analyze": "Haz clic en 'Analizar Documento' para procesar",
    "btn.generate_analysis": "Generar Análisis",
    "btn.generating": "Generando...",
    
    // AI Chat
    "chat.title": "Consulta Inteligente",
    "chat.desc": "Pregúntale a DocuMind cualquier detalle sobre este documento...",
    "chat.placeholder": "Escribe tu pregunta aquí...",
    "btn.send": "Enviar",
    "chat.thinking": "Pensando...",
    "chat.suggestions": "Sugerencias de preguntas:",
    "chat.history": "Historial de conversación",
    "btn.clear_chat": "Limpiar chat",

    // Document Uploader
    "uploader.title": "Ingresar Nuevo Documento",
    "uploader.desc": "Sube archivos de texto o usa plantillas rápidas para analizar su legibilidad y obtener insights con Inteligencia Artificial.",
    "uploader.choose_template": "Selecciona una Plantilla Rápida",
    "uploader.template.invoice": "Factura de Servicios",
    "uploader.template.nda": "Contrato NDA (Borrador)",
    "uploader.template.code": "Código de Ingesta",
    "uploader.placeholder.title": "Escribe el título del documento...",
    "uploader.category_label": "Categoría del Documento",
    "uploader.placeholder.content": "Escribe o pega el contenido del documento en texto plano aquí...",
    "uploader.drag_drop": "Arrastra y suelta un archivo .txt aquí",
    "uploader.or_browse": "o haz clic para explorar tus archivos",
    "uploader.support_note": "Solo se admiten archivos de texto plano (.txt, .md, .ts, .js)",
    "btn.ingest_doc": "Procesar e Ingestar Documento",
    "uploader.alert.required": "El título y el contenido son obligatorios.",
    "uploader.alert.success": "Documento cargado correctamente",

    // Compare Panel
    "compare.title": "Comparación Cruzada de Documentos",
    "compare.desc": "Selecciona dos documentos de la bóveda para contrastar su contenido, analizar cláusulas clave, evaluar discrepancias y riesgos utilizando modelos cognitivos de IA.",
    "compare.select_a": "Seleccionar Documento A",
    "compare.select_b": "Seleccionar Documento B",
    "btn.compare": "Comparar Documentos",
    "compare.comparing": "Comparando...",
    "compare.results_title": "Resultados del Análisis Comparativo",
    "compare.table.attr": "Atributo",
    "compare.table.doc_a": "Documento A",
    "compare.table.doc_b": "Documento B",
    "compare.attr.type": "Tipo de Documento",
    "compare.attr.date": "Fecha/Vigencia",
    "compare.attr.clause": "Cláusula Principal",
    "compare.attr.risks": "Riesgos / Alertas",
    "compare.attr.strengths": "Puntos Fuertes",
    "compare.discrepancies": "Resumen de Discrepancias AI",
    "compare.full_text": "Contenidos de Texto Completos",
    "compare.select_error": "Por favor, selecciona dos documentos diferentes de la lista para poder compararlos."
  },
  en: {
    // App & Navbar
    "app.title": "DocuMind AI",
    "app.subtitle": "Bento Cognitive Suite",
    "app.synced": "Synced",
    "app.clock_title": "Local Time (Mexico)",
    "app.vault_path": "Vault: /secure_env",
    "app.admin_role": "Vault Administrator",
    "app.vault_status": "Secure Vault Operating",
    "view.viewer": "Viewer & Insights",
    "view.upload": "Document Ingestion",
    "view.compare": "Vault Comparator",
    "btn.new_doc": "Ingest Document",
    "btn.compare_docs": "AI Cross-Comparison",
    "warning.gemini": "Configure the GEMINI_API_KEY key",
    "warning.cohere": "Add COHERE_API_KEY in .env",
    
    // Category Names
    "category.all": "All",
    "category.financial": "Financial",
    "category.legal": "Legal",
    "category.technical": "Technical",
    "category.personal": "Personal",
    "category.hr": "Human Resources",
    
    // Search
    "search.placeholder": "Search documents...",
    "search.no_docs": "No documents found",
    
    // Deletion Modal
    "delete.title": "Delete Document",
    "delete.confirm_msg": "Are you sure you want to permanently delete this document?",
    "delete.warning": "This action cannot be undone.",
    "delete.action": "Delete",
    "delete.cancel": "Cancel",

    // Document Viewer
    "viewer.readability_analysis": "Readability Analysis",
    "viewer.words": "Words",
    "viewer.sentences": "Sentences",
    "viewer.syllables": "Syllables",
    "viewer.flesch_score": "Flesch-Kincaid Index",
    "viewer.reading_level": "Reading Level",
    "viewer.reading_level.very_easy": "Very Easy",
    "viewer.reading_level.easy": "Easy",
    "viewer.reading_level.standard": "Standard",
    "viewer.reading_level.difficult": "Difficult",
    "viewer.reading_level.very_difficult": "Very Difficult",
    "viewer.category": "Category",
    "viewer.created": "Created",
    "viewer.current_version": "Current Version",
    "viewer.version_num": "Version",
    
    // Viewer Buttons & Tooltips
    "btn.edit": "Edit",
    "btn.focus_mode": "Focus Mode",
    "btn.exit_focus": "Exit Focus",
    "btn.download": "Download",
    "btn.reanalyze": "Reanalyze",
    "btn.saving": "Saving...",
    "btn.save_version": "Save Version",
    "btn.cancel_edit": "Cancel",
    "placeholder.change_summary": "Change summary (e.g. Fixed clause 4)...",
    "placeholder.doc_content": "Write your document content...",
    
    // Version History
    "history.title": "Version History",
    "history.previewing": "Version Preview",
    "history.restore": "Restore",
    "history.return_editor": "Return to Editor",
    "history.no_summary": "No change summary",
    "history.preview_warning": "You are previewing a previous version of the document.",
    "history.empty": "There are no versions registered for this document in the local vault.",
    "history.table.ver": "Version",
    "history.table.date": "Date/Time",
    "history.table.summary": "Change Summary",
    "history.table.title": "Document Title",

    // AI Insights Panel
    "risk.high": "High Risk",
    "risk.moderate": "Moderate Risk",
    "risk.low": "Low Risk",
    "tab.analysis": "AI Analysis",
    "tab.chat": "AI Chat",
    "insights.cognitive_summary": "Cognitive Summary",
    "insights.key_clauses": "Key Clauses & Entities",
    "insights.risk_analysis": "Risk or Focus Analysis",
    "insights.no_analysis": "No analysis generated",
    "insights.click_analyze": "Click 'Analyze Document' to process",
    "btn.generate_analysis": "Generate Analysis",
    "btn.generating": "Generating...",
    
    // AI Chat
    "chat.title": "Intelligent Query",
    "chat.desc": "Ask DocuMind any detail about this document...",
    "chat.placeholder": "Type your question here...",
    "btn.send": "Send",
    "chat.thinking": "Thinking...",
    "chat.suggestions": "Suggested questions:",
    "chat.history": "Conversation history",
    "btn.clear_chat": "Clear chat",

    // Document Uploader
    "uploader.title": "Ingest New Document",
    "uploader.desc": "Upload text files or use quick templates to analyze readability and extract insights with Artificial Intelligence.",
    "uploader.choose_template": "Select a Quick Template",
    "uploader.template.invoice": "Service Invoice",
    "uploader.template.nda": "NDA Contract (Draft)",
    "uploader.template.code": "Ingest Code",
    "uploader.placeholder.title": "Write document title...",
    "uploader.category_label": "Document Category",
    "uploader.placeholder.content": "Write or paste plain text document content here...",
    "uploader.drag_drop": "Drag and drop a .txt file here",
    "uploader.or_browse": "or click to browse your files",
    "uploader.support_note": "Only plain text files are supported (.txt, .md, .ts, .js)",
    "btn.ingest_doc": "Process & Ingest Document",
    "uploader.alert.required": "Title and content are required.",
    "uploader.alert.success": "Document loaded successfully",

    // Compare Panel
    "compare.title": "Cross-Document Comparison",
    "compare.desc": "Select two documents from the vault to contrast their content, analyze key clauses, evaluate discrepancies and risks using cognitive AI models.",
    "compare.select_a": "Select Document A",
    "compare.select_b": "Select Document B",
    "btn.compare": "Compare Documents",
    "compare.comparing": "Comparing...",
    "compare.results_title": "Comparative Analysis Results",
    "compare.table.attr": "Attribute",
    "compare.table.doc_a": "Document A",
    "compare.table.doc_b": "Document B",
    "compare.attr.type": "Document Type",
    "compare.attr.date": "Date/Validity",
    "compare.attr.clause": "Main Clause",
    "compare.attr.risks": "Risks / Alerts",
    "compare.attr.strengths": "Strengths",
    "compare.discrepancies": "AI Discrepancy Summary",
    "compare.full_text": "Full Text Contents",
    "compare.select_error": "Please select two different documents from the list to compare them."
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem("documind_lang");
    if (saved === "es" || saved === "en") return saved;
    return "es"; // Default language
  });

  useEffect(() => {
    localStorage.setItem("documind_lang", language);
  }, [language]);

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
