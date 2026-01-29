import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';

interface WelcomeModalProps {
  isNewUser: boolean;
}

const STORAGE_KEY = 'payrollshield_welcome_dismissed';

export function WelcomeModal({ isNewUser }: WelcomeModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isNewUser && typeof window !== 'undefined') {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (!dismissed) {
        setIsOpen(true);
      }
    }
  }, [isNewUser]);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsOpen(false);
  };

  const handleGetStarted = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsOpen(false);
  };

  if (!isNewUser) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <svg
              className="h-8 w-8 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <DialogTitle className="text-2xl">Welcome to PayrollShield!</DialogTitle>
          <DialogDescription className="text-base">
            You're all set to catch costly payroll errors before they happen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-center text-gray-600">
            Let's get you started with your first payroll review in 3 simple steps:
          </p>

          <div className="space-y-3">
            {/* Step 1 */}
            <div className="flex items-start gap-3 rounded-lg bg-green-50 p-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500 text-white text-sm font-medium">
                1
              </div>
              <div>
                <p className="font-medium text-gray-900">Create your account</p>
                <p className="text-sm text-green-600">Done!</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white text-sm font-medium">
                2
              </div>
              <div>
                <p className="font-medium text-gray-900">Upload payroll files</p>
                <p className="text-sm text-gray-500">
                  Upload your baseline and current CSV files
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-300 text-white text-sm font-medium">
                3
              </div>
              <div>
                <p className="font-medium text-gray-900">Review and approve</p>
                <p className="text-sm text-gray-500">
                  Review flagged changes and approve with confidence
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Link href="/upload" onClick={handleGetStarted}>
            <Button className="w-full" size="lg">
              Start Your First Review
            </Button>
          </Link>
          <Button
            variant="ghost"
            className="text-gray-500"
            onClick={handleDismiss}
          >
            I'll explore on my own
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
