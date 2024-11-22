import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session, User, AuthError, AuthApiError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { User as CustomUser } from '../lib/supabase';
import { toast } from 'react-hot-toast';

interface AuthContextType {
  session: Session | null;
  user: CustomUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user data:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in fetchUserData:', error);
      throw error;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);

        if (session?.user) {
          const userData = await fetchUserData(session.user.id);
          setUser(userData);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        toast.error('Error loading user data');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      
      if (session?.user) {
        try {
          const userData = await fetchUserData(session.user.id);
          setUser(userData);
        } catch (error) {
          console.error('Error updating user data:', error);
          toast.error('Error updating user data');
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthError = (error: AuthError | AuthApiError) => {
    if ('message' in error) {
      switch (error.message) {
        case 'Invalid login credentials':
          throw new Error('Invalid email or password');
        case 'Email not confirmed':
          throw new Error('Please verify your email before logging in');
        case 'User already registered':
          throw new Error('An account with this email already exists');
        default:
          throw new Error(error.message);
      }
    }
    throw error;
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password
      });
      
      if (error) {
        handleAuthError(error);
      }

      if (data.user) {
        const userData = await fetchUserData(data.user.id);
        setUser(userData);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred');
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            email: email,
          },
        },
      });

      if (error) {
        handleAuthError(error);
      }

      return { error: null };
    } catch (error) {
      if (error instanceof Error) {
        return { error };
      }
      return { error: new Error('An unexpected error occurred') };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw new Error('Error signing out');
    }
  };

  const value = {
    session,
    user,
    signIn,
    signUp,
    signOut,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}