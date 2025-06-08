'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, Dispatch, SetStateAction } from 'react';
import type { User, Source, Story } from '@/types';

interface AppState {
  currentUser: User | null;
  currentSources: Source[];
  isAdmin: boolean;
  denseMode: boolean;
  darkMode: boolean;
  searchTerm: string;
  sourceHeadlines: Map<string, Story[]>;
}

interface AppContextType extends AppState {
  setCurrentUser: (user: User | null) => void;
  setCurrentSources: Dispatch<SetStateAction<Source[]>>;
  setDenseMode: (mode: boolean) => void;
  setDarkMode: (mode: boolean) => void;
  setSearchTerm: (term: string) => void;
  setSourceHeadlines: (headlines: Map<string, Story[]>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({
    currentUser: null,
    currentSources: [],
    isAdmin: false,
    denseMode: false,
    darkMode: false,
    searchTerm: '',
    sourceHeadlines: new Map(),
  });

  // Only watch darkMode changes
  useEffect(() => {
    if (state.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.darkMode]);

  const setCurrentUser = useCallback((user: User | null) => {
    setState(prev => ({ ...prev, currentUser: user, isAdmin: user?.isAdmin || false }));
  }, []);

  const setCurrentSources = useCallback((sources: SetStateAction<Source[]>) => {
    setState(prev => ({ ...prev, currentSources: typeof sources === 'function' ? sources(prev.currentSources) : sources }));
  }, []);

  const setDenseMode = useCallback((mode: boolean) => {
    setState(prev => ({ ...prev, denseMode: mode }));
  }, []);

  const setDarkMode = useCallback((mode: boolean) => {
    setState(prev => ({ ...prev, darkMode: mode }));
  }, []);

  const setSearchTerm = useCallback((term: string) => {
    setState(prev => ({ ...prev, searchTerm: term }));
  }, []);

  const setSourceHeadlines = useCallback((headlines: Map<string, Story[]>) => {
    setState(prev => ({ ...prev, sourceHeadlines: headlines }));
  }, []);

  const value = useMemo(() => ({
    ...state,
    setCurrentUser,
    setCurrentSources,
    setDenseMode,
    setDarkMode,
    setSearchTerm,
    setSourceHeadlines,
  }), [state, setCurrentUser, setCurrentSources, setDenseMode, setDarkMode, setSearchTerm, setSourceHeadlines]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppProvider');
  }
  return context;
} 