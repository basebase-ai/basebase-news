'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, Dispatch, SetStateAction } from 'react';
import type { User, Source, Story } from '@/types';
import { fetchApi } from '@/lib/api';

interface AppState {
  currentUser: User | null;
  currentSources: Source[];
  friends: User[];
  isAdmin: boolean;
  denseMode: boolean;
  darkMode: boolean;
  searchTerm: string;
  sourceHeadlines: Map<string, Story[]>;
  isSignInModalOpen: boolean;
  toast: { message: string; type: 'success' | 'error' } | null;
  sidebarMinimized: boolean;
}

interface AppContextType extends AppState {
  setCurrentUser: (user: User | null) => void;
  setCurrentSources: Dispatch<SetStateAction<Source[]>>;
  setFriends: Dispatch<SetStateAction<User[]>>;
  setDenseMode: (mode: boolean) => void;
  setDarkMode: (mode: boolean) => void;
  setSearchTerm: (term: string) => void;
  setSourceHeadlines: (headlines: Map<string, Story[]>) => void;
  setSignInModalOpen: (isOpen: boolean) => void;
  setToast: (toast: { message: string; type: 'success' | 'error' } | null) => void;
  setSidebarMinimized: (minimized: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({
    currentUser: null,
    currentSources: [],
    friends: [],
    isAdmin: false,
    denseMode: false,
    darkMode: false,
    searchTerm: '',
    sourceHeadlines: new Map(),
    isSignInModalOpen: false,
    toast: null,
    sidebarMinimized: false,
  });

  // Initialize state from user preferences
  useEffect(() => {
    const user = state.currentUser;
    if (user?.denseMode !== undefined || user?.darkMode !== undefined) {
      setState(prev => ({
        ...prev,
        denseMode: user.denseMode || false,
        darkMode: user.darkMode || false,
      }));
    }
  }, [state.currentUser]);

  // Fetch friends when user is loaded
  useEffect(() => {
    const fetchFriends = async () => {
      if (!state.currentUser) {
        setState(prev => ({ ...prev, friends: [] }));
        return;
      }

      try {
        const response = await fetchApi('/api/connections?status=CONNECTED');
        if (response.ok) {
          const data = await response.json();
          const friendsArray = data.connections || [];
          setState(prev => ({ ...prev, friends: friendsArray }));
        }
      } catch (error) {
        console.error('Failed to fetch friends:', error);
      }
    };

    fetchFriends();
  }, [state.currentUser]);

  // Watch darkMode changes
  useEffect(() => {
    if (state.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.darkMode]);

  const setCurrentUser = useCallback((user: User | null) => {
    setState(prev => ({ 
      ...prev, 
      currentUser: user, 
      isAdmin: user?.isAdmin || false,
      denseMode: user?.denseMode || false,
      darkMode: user?.darkMode || false,
    }));
  }, []);

  const setCurrentSources = useCallback((sources: SetStateAction<Source[]>) => {
    setState(prev => ({ ...prev, currentSources: typeof sources === 'function' ? sources(prev.currentSources) : sources }));
  }, []);

  const setFriends = useCallback((friends: SetStateAction<User[]>) => {
    setState(prev => ({ ...prev, friends: typeof friends === 'function' ? friends(prev.friends) : friends }));
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

  const setSignInModalOpen = useCallback((isOpen: boolean) => {
    setState(prev => ({ ...prev, isSignInModalOpen: isOpen }));
  }, []);

  const setToast = useCallback((toast: { message: string; type: 'success' | 'error' } | null) => {
    setState(prev => ({ ...prev, toast }));
  }, []);

  const setSidebarMinimized = useCallback((minimized: boolean) => {
    setState(prev => ({ ...prev, sidebarMinimized: minimized }));
  }, []);

  const value = useMemo(() => ({
    ...state,
    setCurrentUser,
    setCurrentSources,
    setFriends,
    setDenseMode,
    setDarkMode,
    setSearchTerm,
    setSourceHeadlines,
    setSignInModalOpen,
    setToast,
    setSidebarMinimized,
  }), [state, setCurrentUser, setCurrentSources, setFriends, setDenseMode, setDarkMode, setSearchTerm, setSourceHeadlines, setSignInModalOpen, setToast, setSidebarMinimized]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppProvider');
  }
  return context;
} 