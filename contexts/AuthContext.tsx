import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper function to ensure user has an organization
  const ensureUserHasOrganization = async (user: User) => {
    try {
      // Check if user already has an organization
      const { data: mapping } = await supabase
        .from('user_organization_mapping')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (!mapping) {
        // User doesn't have an organization - create one
        const orgName = (user.email?.split('@')[0] || 'User') + "'s Organization";

        const { data: newOrg, error: orgError } = await supabase
          .from('organization')
          .insert({ organization_name: orgName })
          .select()
          .single();

        if (!orgError && newOrg) {
          // Link user to organization
          await supabase
            .from('user_organization_mapping')
            .insert({
              user_id: user.id,
              organization_id: newOrg.organization_id,
              role: 'admin'
            });
        }
      }
    } catch (error) {
      // Silently fail - don't block auth flow
      console.error('Error ensuring user has organization:', error);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        await ensureUserHasOrganization(session.user);
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session) {
          await ensureUserHasOrganization(session.user);
        }
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
