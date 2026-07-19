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

export interface DocumentVersion {
  id: string;
  content: string;
  timestamp: string;
  title: string;
  changeSummary: string;
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
  versions?: DocumentVersion[];
  tags?: string[];
}

export interface StepLatencies {
  retrievalMs: number;
  guardrailMs: number;
  generationMs: number;
}

export interface ChatMetrics {
  latencyMs: number;
  costUsd: number;
  groundedness: number; // 0-100
  uncertainty: 'Bajo' | 'Medio' | 'Alto';
  faithfulness: number; // 0-100
  outOfDomain: boolean;
  stepLatencies: StepLatencies;
  retrievedChunks: string[];
  chunkUtilization?: number;
  chunkAttributions?: { chunk: string; score: number; attributed: boolean }[];
  isCached?: boolean;
}

export interface GuardrailStatus {
  inputTriggered: boolean;
  inputReason?: string;
  outputTriggered: boolean;
  outputReason?: string;
}

export interface ChatFeedback {
  liked: boolean | null;
  comment?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metrics?: ChatMetrics;
  guardrails?: GuardrailStatus;
  feedback?: ChatFeedback;
  promptTechnique?: 'standard' | 'cot' | 'cove';
  thinkingProcess?: string;
  searchSources?: SearchGroundingSource[];
}

export interface SearchGroundingSource {
  title: string;
  uri: string;
}
