import { useEffect } from 'react';
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
      };
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
 */
export function Userback() {
  const { user, loading } = useAuth();

  useEffect(() => {
    // Wait for auth to be resolved
    if (loading) return;

    // Initialize Userback
    window.Userback = window.Userback || {};
    window.Userback.access_token = USERBACK_ACCESS_TOKEN;

    // If user is logged in, pass their data
    if (user) {
      window.Userback.user_data = {
        id: user.id,
        info: {
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          email: user.email || undefined,
        },
      };
    }

    // Check if script is already loaded
    if (document.querySelector('script[src*="userback.io"]')) {
      return;
    }

    // Load Userback script
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://static.userback.io/widget/v1.js';
    (document.head || document.body).appendChild(script);

    // Cleanup function
    return () => {
      // Note: We don't remove the script on unmount as Userback manages its own lifecycle
    };
  }, [user, loading]);

  // This component doesn't render anything visible
  return null;
}

export default Userback;
