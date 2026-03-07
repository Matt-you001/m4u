import api from '@/utils/api';
import { createContext, useContext, useEffect, useState } from 'react';

type UserState = {
  plan: 'free' | 'basic' | 'premium';
  totalCredits: number;
  refreshUser: () => Promise<void>;
};

const UserContext = createContext<UserState | null>(null);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [plan, setPlan] = useState<'free' | 'basic' | 'premium'>('free');
  const [totalCredits, setTotalCredits] = useState(0);

  const refreshUser = async () => {
    const res = await api.get('/user/me');
    setPlan(res.data.plan);
    setTotalCredits(res.data.totalCredits);
  };

  useEffect(() => {
    refreshUser();
  }, []);

  return (
    <UserContext.Provider value={{ plan, totalCredits, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used inside UserProvider');
  return ctx;
};
