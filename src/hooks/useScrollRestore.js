import { useEffect, useRef } from 'react';

// Recuerda la posición del scroll de una pantalla (en sessionStorage) y la restaura al volver,
// una vez que `ready` es true (p. ej. cuando terminaron de cargar los resultados).
export const useScrollRestore = (key, ready) => {
  const restored = useRef(false);

  // Guardar mientras el usuario scrollea. Se ignora hasta restaurar, para que el
  // "volver arriba" al cambiar de pantalla no pise la posición guardada.
  useEffect(() => {
    let frame = null;
    const onScroll = () => {
      if (!restored.current || frame) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        try { sessionStorage.setItem(key, String(Math.round(window.scrollY))); } catch { /* storage no disponible */ }
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [key]);

  useEffect(() => {
    if (!ready || restored.current) return;
    const frame = requestAnimationFrame(() => {
      let y = 0;
      try { y = Number(sessionStorage.getItem(key)) || 0; } catch { /* storage no disponible */ }
      if (y > 0) window.scrollTo(0, y);
      restored.current = true;
    });
    return () => cancelAnimationFrame(frame);
  }, [key, ready]);
};
