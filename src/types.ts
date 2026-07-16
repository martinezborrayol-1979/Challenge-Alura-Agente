export interface DocumentMetadataItem {
  key: string;
  value: string;
}

export interface AnalysisData {
  category: string;
  summary: string;
  language: string;
  metadata: DocumentMetadataItem[];
  suggestedActions: string[];
  riskLevel: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  content: string;
  category: 'Financiero' | 'Legal' | 'Técnico' | 'Recursos Humanos' | 'General';
  status: 'Syncing' | 'Deployed' | 'Idle';
  createdAt: string;
  analysis?: AnalysisData;
  executiveSummary?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
