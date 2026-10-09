import { Alert, Case, Dataset, EarlyWarning, EvidenceItem, InterventionOutcome, InterventionRecommendation, InvestigationNote } from '../../../domain';

export interface CaseRepository {
  list(): Promise<Case[]>;
  getById(id: string): Promise<Case | null>;
  update(id: string, patch: Partial<Case>): Promise<Case>;
}

export interface AlertRepository {
  list(): Promise<Alert[]>;
  acknowledge(id: string): Promise<Alert>;
}

export interface WarningRepository {
  list(): Promise<EarlyWarning[]>;
  update(id: string, patch: Partial<EarlyWarning>): Promise<EarlyWarning>;
}

export interface InvestigationRepository {
  addNote(input: Omit<InvestigationNote, 'id' | 'createdAt' | 'updatedAt'>): Promise<InvestigationNote>;
  addEvidence(input: Omit<EvidenceItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<EvidenceItem>;
}

export interface InterventionRepository {
  upsert(item: InterventionRecommendation): Promise<InterventionRecommendation>;
  recordOutcome(outcome: InterventionOutcome): Promise<InterventionOutcome>;
}

export interface DatasetRepository {
  load(): Promise<Dataset>;
  reset(): Promise<Dataset>;
  cases: CaseRepository;
  alerts: AlertRepository;
  warnings: WarningRepository;
  investigations: InvestigationRepository;
  interventions: InterventionRepository;
}
