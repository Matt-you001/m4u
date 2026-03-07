import React, { createContext, useContext, useState } from 'react';

type HistoryItem = {
  id: string;
  text: string;
  type: 'generated' | 'translated';
  createdAt: number;
};

type HistoryContextType = {
  history: HistoryItem[];
  addToHistory: (item: Omit<HistoryItem, 'id' | 'createdAt'>) => void;
};

const HistoryContext = createContext<HistoryContextType | null>(null);

export function HistoryProvider({ children }: { children: React.ReactNode }) {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const addToHistory = (item: Omit<HistoryItem, 'id' | 'createdAt'>) => {
    setHistory(prev => [
      {
        id: Date.now().toString(),
        createdAt: Date.now(),
        ...item,
      },
      ...prev,
    ]);
  };

  return (
    <HistoryContext.Provider value={{ history, addToHistory }}>
      {children}
    </HistoryContext.Provider>
  );
}

export const useHistory = () => {
  const ctx = useContext(HistoryContext);
  if (!ctx) throw new Error('useHistory must be used inside HistoryProvider');
  return ctx;
};
