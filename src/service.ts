import {
  Dataset,
  Alert,
  Case,
  EarlyWarning,
  InvestigationNote,
  InterventionOutcome,
  InterventionRecommendation,
  AuditEvent,
} from "./types";
import { seedData } from "./data";
const KEY = "sentinel-demo-dataset-v1";
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
export const loadData = (): Dataset => {
  const saved = localStorage.getItem(KEY);
  if (!saved) return clone(seedData);
  try {
    const parsed = JSON.parse(saved) as Partial<Dataset>;
    const collections: (keyof Dataset)[] = ["complaints", "cases", "accounts", "transactions", "relationships", "candidates", "predictions", "interventions", "warnings", "alerts", "alternateExits", "notes", "evidence", "outcomes", "audit", "users", "patterns"];
    if (!collections.every((key) => Array.isArray(parsed[key]))) throw new Error("Dataset collections are incomplete.");
    return parsed as Dataset;
  } catch (error) {
    console.error("Unable to load the persisted demo dataset. Reset the demo to seed data.", error);
    throw new Error("Persisted demo data is invalid. Use Reset demo data to restore the seed dataset.");
  }
};
const persist = (data: Dataset) =>
  localStorage.setItem(KEY, JSON.stringify(data));
export const listRecords = <K extends keyof Dataset>(
  data: Dataset,
  key: K,
): Dataset[K] => data[key];
export const getById = <K extends keyof Dataset>(
  data: Dataset,
  key: K,
  id: string,
) => (data[key] as Array<{ id: string }>).find((item) => item.id === id);
export const updateCase = (
  data: Dataset,
  id: string,
  patch: Partial<Case>,
): Dataset => {
  const next = clone(data);
  next.cases = next.cases.map((c) =>
    c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c,
  );
  persist(next);
  return next;
};
export const addNote = (
  data: Dataset,
  note: Omit<InvestigationNote, "id" | "createdAt" | "updatedAt">,
): Dataset => {
  const next = clone(data);
  const stamp = new Date().toISOString();
  next.notes.unshift({
    ...note,
    id: `note-${Date.now()}`,
    createdAt: stamp,
    updatedAt: stamp,
  });
  persist(next);
  return next;
};
export const updateNote = (
  data: Dataset,
  id: string,
  patch: Partial<InvestigationNote>,
): Dataset => {
  const next = clone(data);
  next.notes = next.notes.map((note) =>
    note.id === id
      ? { ...note, ...patch, updatedAt: new Date().toISOString() }
      : note,
  );
  persist(next);
  return next;
};
export const addEvidence = (
  data: Dataset,
  evidence: Omit<
    import("./types").EvidenceItem,
    "id" | "createdAt" | "updatedAt"
  >,
): Dataset => {
  const next = clone(data);
  const stamp = new Date().toISOString();
  next.evidence.unshift({
    ...evidence,
    id: `ev-${Date.now()}`,
    createdAt: stamp,
    updatedAt: stamp,
  });
  persist(next);
  return next;
};
export const acknowledgeAlert = (data: Dataset, id: string): Dataset => {
  const next = clone(data);
  next.alerts = next.alerts.map((a) =>
    a.id === id
      ? { ...a, acknowledged: true, updatedAt: new Date().toISOString() }
      : a,
  );
  persist(next);
  return next;
};
export const upsertAlert = (data: Dataset, item: Alert): Dataset => {
  const next = clone(data);
  const index = next.alerts.findIndex((a) => a.id === item.id);
  if (index >= 0) next.alerts[index] = item;
  else next.alerts.unshift(item);
  persist(next);
  return next;
};
export const updateWarning = (
  data: Dataset,
  id: string,
  patch: Partial<EarlyWarning>,
): Dataset => {
  const next = clone(data);
  next.warnings = next.warnings.map((w) =>
    w.id === id ? { ...w, ...patch, updatedAt: new Date().toISOString() } : w,
  );
  persist(next);
  return next;
};
export const addAlternateExit = (
  data: Dataset,
  event: Omit<
    import("./types").AlternateExitEvent,
    "id" | "createdAt" | "updatedAt"
  >,
): Dataset => {
  const next = clone(data);
  const stamp = new Date().toISOString();
  next.alternateExits.unshift({
    ...event,
    id: `exit-${Date.now()}`,
    createdAt: stamp,
    updatedAt: stamp,
    observedAt: event.observedAt || stamp,
  });
  persist(next);
  return next;
};
export const upsertIntervention = (
  data: Dataset,
  item: InterventionRecommendation,
): Dataset => {
  const next = clone(data);
  const index = next.interventions.findIndex((i) => i.id === item.id);
  if (index >= 0) next.interventions[index] = item;
  else next.interventions.unshift(item);
  persist(next);
  return next;
};
export const recordOutcome = (
  data: Dataset,
  outcome: InterventionOutcome,
): Dataset => {
  const next = clone(data);
  next.outcomes.unshift(outcome);
  persist(next);
  return next;
};
export const addAudit = (
  data: Dataset,
  event: Omit<AuditEvent, "id" | "createdAt" | "updatedAt">,
): Dataset => {
  const next = clone(data);
  const stamp = new Date().toISOString();
  next.audit.unshift({
    ...event,
    id: `aud-${Date.now()}`,
    createdAt: stamp,
    updatedAt: stamp,
  });
  persist(next);
  return next;
};
export const resetDemo = (): Dataset => {
  const next = clone(seedData);
  persist(next);
  return next;
};
export const clearDemo = () => localStorage.removeItem(KEY);
export type { Alert };
