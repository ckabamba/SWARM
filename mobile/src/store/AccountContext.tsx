import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { MobileAccount, WarmPathApiError, warmPathApi } from '../services/warmPathApi';

interface AccountContextValue {
  account: MobileAccount | null;
  loading: boolean;
  error: string;
  signIn: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<MobileAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setAccount(await warmPathApi.me());
      setError('');
    } catch (reason) {
      if (reason instanceof WarmPathApiError && reason.status === 401) {
        setAccount(null);
        setError('');
      } else {
        setError(reason instanceof Error ? reason.message : 'Could not load your account.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      setAccount(await warmPathApi.signIn(email, password));
      setError('');
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Could not sign in.';
      setError(message);
      throw reason;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    setLoading(true);
    try {
      setAccount(await warmPathApi.register(name, email, password));
      setError('');
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Could not create your account.';
      setError(message);
      throw reason;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await warmPathApi.signOut();
      setAccount(null);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not sign out.');
      throw reason;
    } finally {
      setLoading(false);
    }
  }, []);

  const value = useMemo(() => ({
    account, loading, error, signIn, register, signOut, refresh, clearError: () => setError(''),
  }), [account, loading, error, signIn, register, signOut, refresh]);

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  const context = useContext(AccountContext);
  if (!context) throw new Error('useAccount must be used within AccountProvider.');
  return context;
}
