import { useCallback, useState } from 'react';

export function useMutation<T, E = Error>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<E | null>(null);
  const [data, setData] = useState<T | null>(null);

  const mutate = useCallback(
    async (
      url: string,
      options: {
        method?: 'POST' | 'PUT' | 'DELETE';
        body?: any;
      } = {}
    ) => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('token');
        const response = await fetch(url, {
          method: options.method || 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: options.body ? JSON.stringify(options.body) : undefined,
        });

        const json = await response.json();
        if (response.ok) {
          setData(json);
          return json;
        } else {
          const err = json.error || 'Request failed';
          setError(err as E);
          throw new Error(err);
        }
      } catch (err: any) {
        setError(err as E);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { mutate, loading, error, data };
}
