import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

// Extend Window interface for Userback
declare global {
  interface Window {
    Userback?: {
      access_token?: string;
      user_data?: {
        id: string;
        info: {
          name?: string;
          email?: string;
        };
      } | null;
      // Userback API methods
      identify?: (userId: string, userData: object) => void;
      destroy?: () => void;
      init?: () => void;
      open?: () => void;
      close?: () => void;
    };
  }
}

const USERBACK_ACCESS_TOKEN = 'A-7jbKqvO1LEwzqPBs1kYExRogg';

/**
 * Userback Feedback Widget
 *
 * Loads the Userback widget for collecting user feedback.
 * - For logged-in users: passes user ID and email for identification
 * - For visitors: loads the basic widget without user data
 * - Properly clears user data on sign out
 */
export function Userback() {
  const { user, loading } = useAuth();
  const scriptLoaded = useRef(false);

  useEffect(() => {
    // Wait for auth to be resolved
    if (loading) return;

    // Initialize Userback object
    window.Userback = window.Userback || {};
    window.Userback.access_token = USERBACK_ACCESS_TOKEN;

    // Update user data based on auth state
    if (user) {
      // User is logged in - set their data
      window.Userback.user_data = {
        id: user.id,
        info: {
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          email: user.email || undefined,
        },
      };

      // If Userback API is available, use identify method
      if (window.Userback.identify) {
        window.Userback.identify(user.id, {
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          email: user.email || '',
        });
      }
    } else {
      // User is logged out - clear their data
      window.Userback.user_data = null;

      // If widget needs to be reset, destroy and reinit
      if (scriptLoaded.current && window.Userback.destroy) {
        window.Userback.destroy();
        // Reinitialize without user data
        if (window.Userback.init) {
          window.Userback.init();
        }
      }
    }

    // Load script only once
    if (!scriptLoaded.current && !document.querySelector('script[src*="userback.io"]')) {
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://static.userback.io/widget/v1.js';
      script.onload = () => {
        scriptLoaded.current = true;
      };
      (document.head || document.body).appendChild(script);
    }
  }, [user, loading]);

  // This component doesn't render anything visible
  return null;
}

export default Userback;
