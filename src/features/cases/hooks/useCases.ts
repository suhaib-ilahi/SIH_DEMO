import { useEffect, useState } from 'react';
import { Case } from '../../../domain';
import { listCases } from '../../../application/use-cases/caseWorkflows';

export function useCases() {
  const [cases, setCases] = useState<Case[]>([]);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    let active = true;
    listCases().then(result => { if (active) setCases(result); }).catch(reason => { if (active) setError(reason instanceof Error ? reason : new Error('Unable to load cases.')); });
    return () => { active = false; };
  }, []);
  return { cases, error, loading: !cases.length && !error };
}
