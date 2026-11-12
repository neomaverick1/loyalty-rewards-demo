import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Address } from 'viem';

import { createDemoSource } from '@/lib/demo';
import { createLiveSource } from '@/lib/rewards';
import type { RewardsSource } from '@/lib/types';

export interface User {
  email: string;
  displayName: string;
}

export interface Wallet {
  address: Address;
  /** 'live' reads the deployed contract; 'demo' uses built-in sample data. */
  mode: 'live' | 'demo';
}

interface SessionState {
  ready: boolean;
  user: User | null;
  wallet: Wallet | null;
  source: RewardsSource | null;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  connectWallet(wallet: Wallet): Promise<void>;
  disconnectWallet(): Promise<void>;
  updateProfile(patch: Partial<Pick<User, 'displayName'>>): Promise<void>;
}

const KEY = 'rewards-demo/session/v1';
const SessionContext = createContext<SessionState | null>(null);

const live = createLiveSource();
const demo = createDemoSource();

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw) as { user: User | null; wallet: Wallet | null };
        setUser(saved.user);
        setWallet(saved.wallet);
      })
      .catch(() => {
        /* a corrupt or unreadable session just means signing in again */
      })
      .finally(() => setReady(true));
  }, []);

  const persist = useCallback(async (next: { user: User | null; wallet: Wallet | null }) => {
    setUser(next.user);
    setWallet(next.wallet);
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* the session still works for this launch */
    }
  }, []);

  const value = useMemo<SessionState>(
    () => ({
      ready,
      user,
      wallet,
      source: wallet ? (wallet.mode === 'live' ? live : demo) : null,
      // Phase One is frontend only: this stands in for the real auth API call.
      async signIn(email) {
        await new Promise((r) => setTimeout(r, 700));
        const name = email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        await persist({ user: { email: email.trim().toLowerCase(), displayName: name }, wallet });
      },
      signOut: () => persist({ user: null, wallet: null }),
      connectWallet: (w) => persist({ user, wallet: w }),
      disconnectWallet: () => persist({ user, wallet: null }),
      updateProfile: async (patch) => {
        if (user) await persist({ user: { ...user, ...patch }, wallet });
      },
    }),
    [ready, user, wallet, persist],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const s = useContext(SessionContext);
  if (!s) throw new Error('useSession must be used inside <SessionProvider>');
  return s;
}
