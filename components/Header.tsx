import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';

export function Header() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
    router.push('/login');
  };

  return (
    <header className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
        {/* Logo - using standard img tag to bypass Next.js Image constraints */}
        <Link href="/" className="flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="PayrollShield"
            style={{
              height: '140px',
              width: 'auto',
              display: 'block'
            }}
          />
        </Link>

        {user ? (
          <div className="flex items-center gap-4 flex-shrink-0">
            <nav className="hidden sm:flex items-center gap-4">
              <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
                Dashboard
              </Link>
              <Link href="/upload" className="text-sm text-gray-600 hover:text-gray-900">
                Upload
              </Link>
            </nav>
            <span className="text-sm text-gray-600 hidden md:inline truncate max-w-[200px]">
              {user.email}
            </span>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link href="/login">
              <Button variant="outline" size="sm">Sign in</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Sign up</Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
