import { useState, useEffect } from 'react';

// useState que se guarda en sessionStorage: sobrevive a navegar a otra pantalla y volver
// (botón atrás o menú) dentro de la misma pestaña. Si el storage no está disponible, funciona como useState.
export const useSessionState = (key, initial) => {
  const [value, setValue] = useState(() => {
    try {
      const raw = key ? sessionStorage.getItem(key) : null;
      if (raw != null) return JSON.parse(raw);
    } catch { /* storage no disponible o valor corrupto */ }
    return typeof initial === 'function' ? initial() : initial;
  });

  useEffect(() => {
    if (!key) return;
    try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* storage no disponible */ }
  }, [key, value]);

  return [value, setValue];
};
