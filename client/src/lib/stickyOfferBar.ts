import { useEffect, useSyncExternalStore } from "react";

// La barre fixe d'offre (bas de page) signale qu'elle est visible, pour que le
// bouton flottant global (orientation gratuite) ne la recouvre pas sur mobile.
let visibleBars = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isStickyOfferBarVisible(): boolean {
  return visibleBars > 0;
}

/** À appeler dans la barre fixe : `visible` vrai tant qu'elle est affichée. */
export function useStickyOfferBarVisibility(visible: boolean): void {
  useEffect(() => {
    if (!visible) return;
    visibleBars += 1;
    emit();
    return () => {
      visibleBars = Math.max(0, visibleBars - 1);
      emit();
    };
  }, [visible]);
}

/** Vrai tant qu'une barre fixe d'offre est visible. */
export function useIsStickyOfferBarVisible(): boolean {
  return useSyncExternalStore(subscribe, isStickyOfferBarVisible, () => false);
}
