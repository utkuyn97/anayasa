/**
 * useAuth — Auth context provider & hook.
 * Manages session state, allowed_users whitelist check.
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { logout as authLogout } from '@/lib/auth';

interface AllowedUserInfo {
  id: string;
  email: string;
  display_name: string;
  color_hex: string;
  role: 'owner' | 'partner';
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userInfo: AllowedUserInfo | null;
  isLoading: boolean;
  isAllowed: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [userInfo, setUserInfo] = useState<AllowedUserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);

  // Fetch allowed_users info for the current user
  const fetchUserInfo = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('allowed_users')
      .select('id, email, display_name, color_hex, role')
      .eq('id', userId)
      .maybeSingle();

    if (data) {
      setUserInfo(data as AllowedUserInfo);
      setIsAllowed(true);
    } else {
      setUserInfo(null);
      setIsAllowed(false);
    }
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) {
        fetchUserInfo(s.user.id).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        fetchUserInfo(s.user.id);
      } else {
        setUserInfo(null);
        setIsAllowed(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserInfo]);

  const handleLogout = useCallback(async () => {
    await authLogout();
    setSession(null);
    setUserInfo(null);
    setIsAllowed(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        userInfo,
        isLoading,
        isAllowed,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
