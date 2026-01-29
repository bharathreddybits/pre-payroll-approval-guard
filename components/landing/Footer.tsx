import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl font-bold text-white">PPG</span>
              <span className="text-sm text-gray-500">Pre-Payroll Approval Guard</span>
            </div>
            <p className="text-sm max-w-md">
              Stop costly payroll mistakes before they happen. Review material changes
              in under 5 minutes with complete audit trail.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-white font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#how-it-works" className="hover:text-white transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <Link href="/signup" className="hover:text-white transition-colors">
                  Free Trial
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Sign In
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="mailto:support@ppg.com" className="hover:text-white transition-colors">
                  Contact
                </a>
              </li>
              <li>
                <span className="text-gray-600">Privacy Policy</span>
              </li>
              <li>
                <span className="text-gray-600">Terms of Service</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Pre-Payroll Approval Guard. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
