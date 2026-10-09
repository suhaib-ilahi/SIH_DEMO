import { Case, Dataset } from '../../domain';
import { getRepositoryProvider } from '../../data-access/repositories/repositoryProvider';

export const listCases = () => getRepositoryProvider().cases.list();
export const getCase = (id: string) => getRepositoryProvider().cases.getById(id);
export const changeCase = (id: string, patch: Partial<Case>) => getRepositoryProvider().cases.update(id, patch);
export const resetDemoDemo = async (): Promise<Dataset> => getRepositoryProvider().reset();
