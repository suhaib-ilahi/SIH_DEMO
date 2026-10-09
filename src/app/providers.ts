import { env } from '../infrastructure/config/env';
import { ApiClient } from '../infrastructure/api/apiClient';
import { HttpRepositoryProvider } from '../data-access/http/httpRepositoryProvider';
import { MockRepositoryProvider } from '../data-access/mock/mockRepositoryProvider';
import { configureRepositoryProvider } from '../data-access/repositories/repositoryProvider';

export const configureApplicationProviders = () => {
  const repositories = env.dataMode === 'mock'
    ? new MockRepositoryProvider()
    : new HttpRepositoryProvider(new ApiClient(env.apiBaseUrl));
  configureRepositoryProvider(repositories);
  return repositories;
};
