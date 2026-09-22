import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Copie une valeur dans le presse-papiers et renvoie la valeur copiée pendant
 * quelques secondes (pour afficher « Copié »). Utilisé par les fenêtres
 * d'inscription et de mot de passe oublié.
 */
export function useCopy(duration = 1800) {
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = useCallback(
    async (value: string) => {
      try {
        await navigator.clipboard.writeText(value);
      } catch {
        // Fallback pour les navigateurs sans API presse-papiers.
        const ta = document.createElement("textarea");
        ta.value = value;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(value);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(null), duration);
    },
    [duration],
  );

  return { copied, copy };
}
