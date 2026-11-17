import { useEffect, useState } from 'react';
import { getJson } from './client.js';

export function useApiData<T>(path: string) {
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: string | null }>({
    data: null, loading: true, error: null,
  });

  useEffect(() => {
    let active = true;
    setState({ data: null, loading: true, error: null });
    getJson<T>(path).then(
      (data) => { if (active) setState({ data, loading: false, error: null }); },
      (error: unknown) => {
        if (active) setState({
          data: null, loading: false,
          error: `Unable to load data: ${error instanceof Error ? error.message : String(error)}`,
        });
      },
    );
    return () => { active = false; };
  }, [path]);

  return state;
}
