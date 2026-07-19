/**
 * Utility for analyzing the sentiment of assistant messages.
 * Leverages high-accuracy heuristics, keywords, and RAG metadata metrics 
 * to classify the message tone into: 'positive', 'neutral', or 'critical'.
 */

import { ChatMessage } from "../types";

const CRITICAL_KEYWORDS = [
  "riesgo", "risk",
  "advertencia", "warning",
  "error", "danger", "peligro",
  "crítico", "critical",
  "grave", "severe",
  "incumplimiento", "non-compliance",
  "penalización", "penalty", "multa", "fine",
  "falta", "lack",
  "insuficiente", "insufficient",
  "excluido", "excluded",
  "limitación", "limitation",
  "bloqueado", "blocked",
  "alerta", "alert",
  "omisión", "omission",
  "inconsistencia", "inconsistency",
  "vulnerabilidad", "vulnerability",
  "fallo", "failure",
  "irregularidad", "irregularity",
  "no cumple", "does not comply",
  "fuera de dominio", "out of domain",
  "atención", "attention",
  "preocupante", "concerning",
  "atraso", "delay",
  "cancelado", "cancelled",
  "suspendido", "suspended",
  "pérdida", "loss",
  "defectuoso", "defective"
];

const POSITIVE_KEYWORDS = [
  "éxito", "success",
  "aprobado", "approved",
  "beneficio", "benefit",
  "excelente", "excellent",
  "correcto", "correct",
  "cumple", "complies",
  "óptimo", "optimal", "optimizado", "optimized",
  "favorable", "favourable",
  "seguro", "secure", "safe",
  "ventaja", "advantage",
  "fortaleza", "strength",
  "limpio", "clean",
  "oportunidad", "opportunity",
  "exitosamente", "successfully",
  "satisfactorio", "satisfactory",
  "ganancia", "gain",
  "solucionado", "solved", "resuelto", "resolved"
];

export function analyzeMessageSentiment(msg: ChatMessage): "positive" | "neutral" | "critical" {
  // Guardrails always override to critical if triggered
  if (msg.guardrails?.inputTriggered || msg.guardrails?.outputTriggered) {
    return "critical";
  }

  // High uncertainty or out-of-domain is critical/warning-prone
  if (msg.metrics?.uncertainty === "Alto" || msg.metrics?.outOfDomain) {
    return "critical";
  }

  const text = msg.content.toLowerCase();

  // If there are specific error message patterns
  if (text.includes("error") || text.includes("falló") || text.includes("fallo")) {
    return "critical";
  }

  // Count keyword occurrences
  let criticalCount = 0;
  let positiveCount = 0;

  for (const keyword of CRITICAL_KEYWORDS) {
    // Basic boundary checks to avoid partial matching
    const regex = new RegExp(`\\b${keyword}\\b`, "gi");
    const matches = text.match(regex);
    if (matches) {
      criticalCount += matches.length;
    }
  }

  for (const keyword of POSITIVE_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\b`, "gi");
    const matches = text.match(regex);
    if (matches) {
      positiveCount += matches.length;
    }
  }

  // Weight scores with metrics if available
  if (msg.metrics) {
    // High faithfulness and groundedness boosts positive
    if (msg.metrics.groundedness >= 90 && msg.metrics.faithfulness >= 90) {
      positiveCount += 2;
    }
    // Low scores boost critical
    if (msg.metrics.groundedness < 60 || msg.metrics.faithfulness < 60) {
      criticalCount += 2;
    }
  }

  if (criticalCount > positiveCount) {
    return "critical";
  } else if (positiveCount > criticalCount && positiveCount > 0) {
    return "positive";
  }

  return "neutral";
}
