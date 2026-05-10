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

          // Initialize 7-day trial subscription for the new org
          try {
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            const accessToken = currentSession?.access_token;
            if (accessToken) {
              await fetch('/api/init-account', {
                method: 'POST',
                headers: { Authorization: `Bearer ${accessToken}` },
              });
            }
          } catch {
            // Non-fatal: trial can be initialized on next login or support can backfill
          }
        }
      }
    } catch (error) {
      // Silently fail - don't block auth flow
      console.error('Error ensuring user has organization:', error);
    }
  };

  useEffect(() => {
    // Safety valve: if auth takes >10s for any reason, unblock the UI
    const timeout = setTimeout(() => setLoading(false), 10000);

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      clearTimeout(timeout);
      // Fire-and-forget: org setup must not block auth loading
      if (session) ensureUserHasOrganization(session.user);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        clearTimeout(timeout);
        // Fire-and-forget: org setup must not block auth loading
        if (session) ensureUserHasOrganization(session.user);
      }
    );

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
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
