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
  logout: () => void;
  isLoading: boolean;
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
        } else {
          console.log('Clearing user');
          setUser(null);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

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

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
