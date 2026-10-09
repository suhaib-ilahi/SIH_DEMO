import { DatasetRepository } from './contracts/repositories';

let provider: DatasetRepository | undefined;

export const configureRepositoryProvider = (next: DatasetRepository) => { provider = next; };
export const getRepositoryProvider = (): DatasetRepository => {
  if (!provider) throw new Error('Repository provider has not been configured.');
  return provider;
};
