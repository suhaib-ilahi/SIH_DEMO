import { DatasetRepository } from '../repositories/contracts/repositories';
import { ApiClient } from '../../infrastructure/api/apiClient';

export class HttpRepositoryProvider implements DatasetRepository {
  constructor(private readonly client: ApiClient) {}
  private unavailable(operation: string): never { throw new Error(`${operation} HTTP repository is provisional and requires a backend contract implementation.`); }
  async load() { return this.client.request<Awaited<ReturnType<DatasetRepository['load']>>>('/dataset'); }
  async reset() { return this.unavailable('Reset'); }
  cases = {
    list: async () => this.client.request<Awaited<ReturnType<DatasetRepository['cases']['list']>>>('/cases'),
    getById: async (id: string) => this.client.request<Awaited<ReturnType<DatasetRepository['cases']['getById']>>>(`/cases/${encodeURIComponent(id)}`),
    update: async () => this.unavailable('Case update'),
  };
  alerts = { list: async () => this.client.request<Awaited<ReturnType<DatasetRepository['alerts']['list']>>>('/alerts'), acknowledge: async () => this.unavailable('Alert acknowledgement') };
  warnings = { list: async () => this.client.request<Awaited<ReturnType<DatasetRepository['warnings']['list']>>>('/warnings'), update: async () => this.unavailable('Warning update') };
  investigations = { addNote: async () => this.unavailable('Note creation'), addEvidence: async () => this.unavailable('Evidence creation') };
  interventions = { upsert: async () => this.unavailable('Intervention update'), recordOutcome: async () => this.unavailable('Outcome recording') };
}
