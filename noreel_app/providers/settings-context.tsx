import React, { createContext, ReactNode, useContext, useState } from 'react';

interface SettingsContextType {
  hideSponsored: boolean;
  setHideSponsored: (value: boolean) => void;
  hideExploreGrid: boolean;
  setHideExploreGrid: (value: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [hideSponsored, setHideSponsored] = useState(true);
  const [hideExploreGrid, setHideExploreGrid] = useState(true);

  return (
    <SettingsContext.Provider value={{ hideSponsored, setHideSponsored, hideExploreGrid, setHideExploreGrid }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
