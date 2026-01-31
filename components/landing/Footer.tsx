import React from 'react';
import Link from 'next/link';

const footerLinks = {
  Product: [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Security', href: '#trust' },
  ],
  Company: [
    { label: 'About', href: '#' },
    { label: 'Contact', href: 'mailto:support@payrollshield.com' },
  ],
  Legal: [
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
  ],
};

export function Footer() {
  return (
    <footer className="relative bg-slate-900 text-slate-400">
      {/* Brand gradient bar */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-brand-blue via-brand-red to-brand-blue" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16 lg:py-20">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="PayrollShield"
              className="h-9 w-auto mb-5 brightness-0 invert"
            />
            <p className="text-sm leading-relaxed max-w-sm">
              Pre-payroll approval guard for teams who need to catch every
              change, flag every risk, and document every decision.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category} className="col-span-1 md:col-span-2">
              <h4 className="text-sm font-semibold text-white mb-4">
                {category}
              </h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith('mailto:') ||
                    link.href.startsWith('#') ? (
                      <a
                        href={link.href}
                        className="text-sm text-slate-400 hover:text-white transition-colors"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-slate-400 hover:text-white transition-colors"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-slate-800 mt-16 pt-8">
          <p className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} PayrollShield. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
