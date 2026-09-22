import { useEffect, useRef, useState } from "react";

/**
 * Wires up every `portal:tour-*` custom event the guided tour dispatches
 * (see `PortalTour.tsx`) and exposes the resulting boolean flags plus
 * imperative freeze/reset hooks that the tour can invoke on the page.
 *
 * Events consumed:
 *  - portal:tour-open / portal:tour-close       → `tourOpen`
 *  - portal:tour-chevron-step-start / -end      → `tourChevronStep`
 *  - portal:tour-actions-step-start / -end      → `tourActionsStep`
 *  - portal:tour-preview-actions-show / -hide   → `tourPreviewActions`
 *    (also calls `tourFreezeRef` / `tourResetRef` when set)
 */
export function usePortalTour() {
  const [tourOpen, setTourOpen] = useState<boolean>(() =>
    typeof window !== "undefined"
      ? Boolean((window as unknown as { __portalTourOpen?: boolean }).__portalTourOpen)
      : false,
  );
  const [tourChevronStep, setTourChevronStep] = useState(false);
  const [tourActionsStep, setTourActionsStep] = useState(false);
  const [tourPreviewActions, setTourPreviewActions] = useState(false);
  const tourPreviewActionsRef = useRef(false);

  const tourFreezeRef = useRef<(() => void) | null>(null);
  const tourResetRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const onOpen = () => setTourOpen(true);
    const onClose = () => setTourOpen(false);
    window.addEventListener("portal:tour-open", onOpen);
    window.addEventListener("portal:tour-close", onClose);
    return () => {
      window.removeEventListener("portal:tour-open", onOpen);
      window.removeEventListener("portal:tour-close", onClose);
    };
  }, []);

  useEffect(() => {
    const onStart = () => setTourChevronStep(true);
    const onEnd = () => setTourChevronStep(false);
    window.addEventListener("portal:tour-chevron-step-start", onStart);
    window.addEventListener("portal:tour-chevron-step-end", onEnd);
    return () => {
      window.removeEventListener("portal:tour-chevron-step-start", onStart);
      window.removeEventListener("portal:tour-chevron-step-end", onEnd);
    };
  }, []);

  useEffect(() => {
    const onStart = () => setTourActionsStep(true);
    const onEnd = () => setTourActionsStep(false);
    window.addEventListener("portal:tour-actions-step-start", onStart);
    window.addEventListener("portal:tour-actions-step-end", onEnd);
    return () => {
      window.removeEventListener("portal:tour-actions-step-start", onStart);
      window.removeEventListener("portal:tour-actions-step-end", onEnd);
    };
  }, []);

  // Preview-actions events also freeze/reset the portal so the tour can
  // pin the "revealed" state without letting the dial state machine drift.
  useEffect(() => {
    const show = () => {
      tourPreviewActionsRef.current = true;
      setTourPreviewActions(true);
      tourFreezeRef.current?.();
    };
    const hide = () => {
      tourPreviewActionsRef.current = false;
      setTourPreviewActions(false);
      tourResetRef.current?.();
    };
    window.addEventListener("portal:tour-preview-actions-show", show);
    window.addEventListener("portal:tour-preview-actions-hide", hide);
    return () => {
      window.removeEventListener("portal:tour-preview-actions-show", show);
      window.removeEventListener("portal:tour-preview-actions-hide", hide);
    };
  }, []);

  const setFreeze = (fn: () => void) => {
    tourFreezeRef.current = fn;
  };
  const setReset = (fn: () => void) => {
    tourResetRef.current = fn;
  };

  return {
    tourOpen,
    tourChevronStep,
    tourActionsStep,
    tourPreviewActions,
    tourPreviewActionsRef,
    tourFreezeRef,
    tourResetRef,
    setFreeze,
    setReset,
  };
}
