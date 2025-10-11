import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface User {
  id: string;
  email: string;
  businessName?: string;
  businessUrl?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithMicrosoft: () => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  hasOAuthCredentials: () => Promise<{ google: boolean; microsoft: boolean }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('Initial session check:', { session: session?.user?.email, error });
      if (session?.user) {
        const userData = {
          id: session.user.id,
          email: session.user.email || '',
          businessName: session.user.user_metadata?.businessName || 'My Business',
          businessUrl: session.user.user_metadata?.businessUrl || 'my-business',
        };
        console.log('Setting user:', userData);
        setUser(userData);

        if (session.provider_token) {
          saveOAuthTokens(session);
        }
      }
      setIsLoading(false);
    }).catch(err => {
      console.error('Session error:', err);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        console.log('Auth state change:', event, session?.user?.email);
        if (session?.user) {
          const userData = {
            id: session.user.id,
            email: session.user.email || '',
            businessName: session.user.user_metadata?.businessName || 'My Business',
            businessUrl: session.user.user_metadata?.businessUrl || 'my-business',
          };
          console.log('Setting user from auth change:', userData);
          setUser(userData);

          if (session.provider_token) {
            await saveOAuthTokens(session);
          }
        } else {
          console.log('Clearing user');
          setUser(null);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const saveOAuthTokens = async (session: any) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/oauth-callback`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider_token: session.provider_token,
          provider_refresh_token: session.provider_refresh_token,
        }),
      });

      if (!response.ok) {
        console.error('Failed to save OAuth tokens');
      }
    } catch (error) {
      console.error('Error saving OAuth tokens:', error);
    }
  };

  const signup = async (email: string, password: string) => {
    console.log('Attempting signup for:', email);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    console.log('Signup result:', { user: data.user?.email, error });
    if (error) throw error;

    if (data.user) {
      const userData = {
        id: data.user.id,
        email: data.user.email || '',
        businessName: data.user.user_metadata?.businessName || 'My Business',
        businessUrl: data.user.user_metadata?.businessUrl || 'my-business',
      };
      console.log('Signup successful, setting user:', userData);
      setUser(userData);
    }
  };

  const login = async (email: string, password: string) => {
    console.log('Attempting login for:', email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    console.log('Login result:', { user: data.user?.email, error });
    if (error) throw error;

    if (data.user) {
      const userData = {
        id: data.user.id,
        email: data.user.email || '',
        businessName: data.user.user_metadata?.businessName || 'My Business',
        businessUrl: data.user.user_metadata?.businessUrl || 'my-business',
      };
      console.log('Login successful, setting user:', userData);
      setUser(userData);
    }
  };

  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'https://www.googleapis.com/auth/gmail.send',
        redirectTo: window.location.origin,
      },
    });

    if (error) throw error;
  };

  const loginWithMicrosoft = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        scopes: 'Mail.Send offline_access',
        redirectTo: window.location.origin,
      },
    });

    if (error) throw error;
  };

  const hasOAuthCredentials = async (): Promise<{ google: boolean; microsoft: boolean }> => {
    if (!user) return { google: false, microsoft: false };

    const { data } = await supabase
      .from('user_oauth_credentials')
      .select('provider')
      .eq('user_id', user.id);

    const providers = data?.map(d => d.provider) || [];

    return {
      google: providers.includes('google'),
      microsoft: providers.includes('microsoft'),
    };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, loginWithGoogle, loginWithMicrosoft, logout, isLoading, hasOAuthCredentials }}>
      {children}
    </AuthContext.Provider>
  );
};
