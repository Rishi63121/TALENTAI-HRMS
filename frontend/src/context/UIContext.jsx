import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const UIContext = createContext(null);

/** Open/closed state for the app-wide overlays, so any component (e.g. a palette action) can open another one. */
export function UIProvider({ children }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);
  const togglePalette = useCallback(() => setPaletteOpen((o) => !o), []);
  const openCopilot = useCallback(() => setCopilotOpen(true), []);
  const closeCopilot = useCallback(() => setCopilotOpen(false), []);
  const toggleCopilot = useCallback(() => setCopilotOpen((o) => !o), []);

  const value = useMemo(
    () => ({ paletteOpen, openPalette, closePalette, togglePalette, copilotOpen, openCopilot, closeCopilot, toggleCopilot }),
    [paletteOpen, openPalette, closePalette, togglePalette, copilotOpen, openCopilot, closeCopilot, toggleCopilot]
  );
  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used within UIProvider');
  return ctx;
}
