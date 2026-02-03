import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const navLinks = [
  { label: 'Product', href: '/product' },
  { label: 'Use Cases', href: '/use-cases' },
  { label: 'Security', href: '/security' },
  { label: 'Pricing', href: '/pricing' },
];

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, loading } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md border-b border-slate-200/60 shadow-sm'
          : 'bg-white/80 backdrop-blur-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-[160px]">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="PayrollShield"
              style={{ height: '120px', width: 'auto' }}
            />
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors nav-link-hover"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            {!loading && user ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white bg-brand-blue rounded-lg hover:bg-brand-blue-dark transition-colors"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white bg-brand-blue rounded-lg hover:bg-brand-blue-dark transition-colors"
                >
                  Start Free Trial
                </Link>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 text-slate-600 hover:text-slate-900"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-100">
          <div className="px-6 py-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="block py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4 mt-2 border-t border-slate-100 space-y-3">
              {!loading && user ? (
                <Link
                  href="/dashboard"
                  className="block w-full text-center px-5 py-2.5 text-sm font-semibold text-white bg-brand-blue rounded-lg"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="block py-2 text-sm font-medium text-slate-600"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/signup"
                    className="block w-full text-center px-5 py-2.5 text-sm font-semibold text-white bg-brand-blue rounded-lg"
                  >
                    Start Free Trial
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
