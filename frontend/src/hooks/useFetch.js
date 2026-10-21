import { useCallback, useEffect, useRef, useState } from 'react';

// const { data, loading, error, reload } = useFetch(() => api.labs(), [deps])
export function useFetch(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const seq = useRef(0);
  const hasData = useRef(false);

  const load = useCallback(async (silent) => {
    const id = ++seq.current;
    if (!silent) setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const data = await fnRef.current();
      hasData.current = true;
      if (id === seq.current) setState({ data, loading: false, error: '' });
    } catch (e) {
      if (id === seq.current) setState((s) => ({ data: silent ? s.data : null, loading: false, error: e.message }));
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(hasData.current); }, deps);
  return { ...state, reload: () => load(true) };
}
