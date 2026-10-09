import { Dataset, Alert, Case, EarlyWarning, EvidenceItem, InterventionOutcome, InterventionRecommendation, InvestigationNote } from '../../domain';
import { addEvidence, addNote, acknowledgeAlert, loadData, recordOutcome, resetDemo, updateCase, updateWarning, upsertIntervention } from '../../service';
import { DatasetRepository } from '../repositories/contracts/repositories';

export class MockRepositoryProvider implements DatasetRepository {
  private data: Dataset;
  constructor() { this.data = loadData(); }
  async load() { this.data = loadData(); return this.data; }
  async reset() { this.data = resetDemo(); return this.data; }
  cases = {
    list: async (): Promise<Case[]> => this.data.cases,
    getById: async (id: string): Promise<Case | null> => this.data.cases.find(item => item.id === id) || null,
    update: async (id: string, patch: Partial<Case>): Promise<Case> => {
      this.data = updateCase(this.data, id, patch);
      const result = this.data.cases.find(item => item.id === id);
      if (!result) throw new Error(`Case ${id} was not found.`);
      return result;
    },
  };
  alerts = {
    list: async (): Promise<Alert[]> => this.data.alerts,
    acknowledge: async (id: string): Promise<Alert> => {
      this.data = acknowledgeAlert(this.data, id);
      const result = this.data.alerts.find(item => item.id === id);
      if (!result) throw new Error(`Alert ${id} was not found.`);
      return result;
    },
  };
  warnings = {
    list: async (): Promise<EarlyWarning[]> => this.data.warnings,
    update: async (id: string, patch: Partial<EarlyWarning>): Promise<EarlyWarning> => {
      this.data = updateWarning(this.data, id, patch);
      const result = this.data.warnings.find(item => item.id === id);
      if (!result) throw new Error(`Warning ${id} was not found.`);
      return result;
    },
  };
  investigations = {
    addNote: async (input: Omit<InvestigationNote, 'id' | 'createdAt' | 'updatedAt'>): Promise<InvestigationNote> => {
      this.data = addNote(this.data, input);
      return this.data.notes[0];
    },
    addEvidence: async (input: Omit<EvidenceItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<EvidenceItem> => {
      this.data = addEvidence(this.data, input);
      return this.data.evidence[0];
    },
  };
  interventions = {
    upsert: async (item: InterventionRecommendation): Promise<InterventionRecommendation> => {
      this.data = upsertIntervention(this.data, item);
      return item;
    },
    recordOutcome: async (outcome: InterventionOutcome): Promise<InterventionOutcome> => {
      this.data = recordOutcome(this.data, outcome);
      return outcome;
    },
  };
}
