import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { toast } from 'sonner';
import { Upload, LayoutDashboard, LogOut, CreditCard, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
  isUploadLocked?: boolean;
}

export function Header({ isUploadLocked = false }: HeaderProps) {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
    router.push('/login');
  };

  const isActive = (path: string) => router.pathname === path;

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="PayrollShield"
              className="block h-8 w-auto"
            />
          </Link>

          {user ? (
            <div className="flex items-center gap-1">
              {/* Nav links */}
              <nav className="hidden sm:flex items-center mr-4" aria-label="Main navigation">
                <Link
                  href="/dashboard"
                  aria-current={isActive('/dashboard') ? 'page' : undefined}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-1 ${
                    isActive('/dashboard')
                      ? 'bg-slate-100 text-slate-900 border-b-2 border-brand-blue'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
                <Link
                  href="/upload"
                  aria-current={isActive('/upload') ? 'page' : undefined}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-1 ${
                    isActive('/upload')
                      ? 'bg-slate-100 text-slate-900 border-b-2 border-brand-blue'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }${isUploadLocked ? ' opacity-60' : ''}`}
                >
                  <Upload className="h-4 w-4" />
                  Upload
                  {isUploadLocked && <Lock size={12} className="ml-0.5" />}
                </Link>
                <Link
                  href="/subscription"
                  aria-current={isActive('/subscription') ? 'page' : undefined}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-1 ${
                    isActive('/subscription')
                      ? 'bg-slate-100 text-slate-900 border-b-2 border-brand-blue'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <CreditCard className="h-4 w-4" />
                  Subscription
                </Link>
              </nav>

              {/* Separator */}
              <div className="hidden sm:block w-px h-6 bg-slate-200 mr-3" />

              {/* User info + sign out */}
              <span className="text-xs text-slate-400 hidden md:inline truncate max-w-[180px] mr-2">
                {user.email}
              </span>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-md transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="px-4 py-1.5 text-sm font-medium text-white bg-brand-blue rounded-lg hover:bg-brand-blue-dark transition-colors"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
