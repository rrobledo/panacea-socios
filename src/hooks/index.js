import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';

// ── Generic fetch hook ─────────────────────────────────────────────────────
export const useFetch = (url, params = {}, deps = []) => {
  const [data, setData]     = useState(null);
  const [loading, setLoad]  = useState(true);
  const [error, setError]   = useState(null);
  const ctrl = useRef(null);

  const fetch = useCallback(async (overrideParams) => {
    if (ctrl.current) ctrl.current.abort();
    ctrl.current = new AbortController();
    setLoad(true); setError(null);
    try {
      const res = await api.get(url, {
        params: { ...params, ...overrideParams },
        signal: ctrl.current.signal,
      });
      setData(res.data);
    } catch (e) {
      if (e.name !== 'CanceledError') setError(e);
    } finally {
      setLoad(false);
    }
  }, [url, ...deps]);

  useEffect(() => { fetch(); return () => ctrl.current?.abort(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
};

// ── Paginated list hook ────────────────────────────────────────────────────
export const useList = (url, defaultParams = {}) => {
  const [params, setParams] = useState({ page: 1, limit: 20, ...defaultParams });
  const { data, loading, error, refetch } = useFetch(url, params, [JSON.stringify(params)]);

  const setPage  = (page)  => setParams(p => ({ ...p, page }));
  const setLimit = (limit) => setParams(p => ({ ...p, limit, page: 1 }));
  const setSort  = (field) => setParams(p => ({
    ...p, sort: field,
    order: p.sort === field && p.order === 'asc' ? 'desc' : 'asc',
  }));
  const search   = (q)     => setParams(p => ({ ...p, q, page: 1 }));
  const filter   = (f)     => setParams(p => ({ ...p, ...f, page: 1 }));
  const reset    = ()      => setParams({ page: 1, limit: 20, ...defaultParams });

  return {
    items: data?.items || data || [],
    total: data?.total || 0,
    pages: data?.pages || 1,
    params, loading, error,
    setPage, setLimit, setSort, search, filter, reset, refetch,
  };
};

// ── Mutation hook ──────────────────────────────────────────────────────────
export const useMutation = (fn, options = {}) => {
  const [loading, setLoad] = useState(false);
  const [error, setError]  = useState(null);

  const mutate = async (...args) => {
    setLoad(true); setError(null);
    try {
      const result = await fn(...args);
      options.onSuccess?.(result);
      return result;
    } catch (e) {
      setError(e);
      options.onError?.(e);
      throw e;
    } finally {
      setLoad(false);
    }
  };

  return { mutate, loading, error };
};

// ── Confirm dialog hook ────────────────────────────────────────────────────
export const useConfirm = () => {
  const [state, setState] = useState(null);

  const confirm = (opts) =>
    new Promise(resolve => setState({ ...opts, resolve }));

  const handleResolve = (value) => {
    state?.resolve(value);
    setState(null);
  };

  return { confirm, dialog: state, resolve: handleResolve };
};

// ── Local storage hook ─────────────────────────────────────────────────────
export const useLocalStorage = (key, initial) => {
  const [value, setValue] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key)) ?? initial; }
    catch { return initial; }
  });
  const set = (v) => {
    const next = typeof v === 'function' ? v(value) : v;
    setValue(next);
    localStorage.setItem(key, JSON.stringify(next));
  };
  return [value, set];
};

// ── Debounce hook ─────────────────────────────────────────────────────────
export const useDebounce = (value, delay = 400) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};
