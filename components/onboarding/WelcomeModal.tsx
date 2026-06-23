import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { useAuth } from '../../contexts/AuthContext';

interface WelcomeModalProps {
  isNewUser: boolean;
}

export function WelcomeModal({ isNewUser }: WelcomeModalProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const storageKey = `ppg-welcome-dismissed-${user?.id || 'anon'}`;

  useEffect(() => {
    if (isNewUser && typeof window !== 'undefined') {
      const dismissed = localStorage.getItem(storageKey);
      if (!dismissed) {
        setIsOpen(true);
      }
    }
  }, [isNewUser, storageKey]);

  const handleDismiss = () => {
    localStorage.setItem(storageKey, 'true');
    setIsOpen(false);
  };

  const handleGetStarted = () => {
    localStorage.setItem(storageKey, 'true');
    setIsOpen(false);
  };

  if (!isNewUser) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-blue/10">
            <ShieldCheck className="h-8 w-8 text-brand-blue" />
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
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-blue text-white text-sm font-medium">
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
