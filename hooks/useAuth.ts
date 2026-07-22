import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/auth/login');
    } else {
      setToken(storedToken);
    }
    setLoading(false);
  }, [router]);

  const logout = () => {
    localStorage.removeItem('token');
    router.push('/auth/login');
  };

  return { token, loading, logout, isAuthenticated: !!token };
}

export function useApi<T>(
  url: string,
  shouldFetch = true
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shouldFetch) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const json = await response.json();
        if (response.ok) {
          setData(json);
        } else {
          setError(json.error || 'Failed to fetch');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [url, shouldFetch]);

  return { data, loading, error };
}
