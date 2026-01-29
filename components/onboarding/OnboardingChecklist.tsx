import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';

interface OnboardingProgress {
  account_created: boolean;
  first_upload: boolean;
  first_review: boolean;
}

interface OnboardingChecklistProps {
  progress: OnboardingProgress;
  latestSessionId?: string;
}

export function OnboardingChecklist({ progress, latestSessionId }: OnboardingChecklistProps) {
  const allComplete = progress.account_created && progress.first_upload && progress.first_review;

  const steps = [
    {
      id: 'account',
      title: 'Create your account',
      description: 'Sign up for PPG',
      completed: progress.account_created,
      href: null,
      cta: null,
    },
    {
      id: 'upload',
      title: 'Upload payroll files',
      description: 'Upload your baseline and current CSV files for comparison',
      completed: progress.first_upload,
      href: '/upload',
      cta: 'Upload Files',
    },
    {
      id: 'review',
      title: 'Complete your first review',
      description: 'Review flagged changes and approve or reject the payroll run',
      completed: progress.first_review,
      href: latestSessionId ? `/review/${latestSessionId}` : null,
      cta: 'Review Changes',
    },
  ];

  // Find the current active step (first incomplete step)
  const activeStepIndex = steps.findIndex((step) => !step.completed);

  if (allComplete) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-8 w-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-green-800">
              You're all set!
            </h3>
            <p className="mt-1 text-green-600">
              You've completed the getting started checklist.
            </p>
            <Link href="/upload" className="mt-4 inline-block">
              <Button variant="outline" className="border-green-300 text-green-700 hover:bg-green-100">
                Start Another Review
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <svg
            className="h-5 w-5 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
          Getting Started
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {steps.map((step, index) => {
            const isActive = index === activeStepIndex;
            const isPending = index > activeStepIndex;

            return (
              <div
                key={step.id}
                className={`flex items-start gap-3 rounded-lg p-3 transition-colors ${
                  step.completed
                    ? 'bg-green-50'
                    : isActive
                    ? 'bg-primary/5 ring-1 ring-primary/20'
                    : 'bg-gray-50'
                }`}
              >
                {/* Status Icon */}
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
                    step.completed
                      ? 'bg-green-500 text-white'
                      : isActive
                      ? 'bg-primary text-white'
                      : 'bg-gray-300 text-white'
                  }`}
                >
                  {step.completed ? (
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`font-medium ${
                      step.completed
                        ? 'text-green-800'
                        : isActive
                        ? 'text-gray-900'
                        : 'text-gray-500'
                    }`}
                  >
                    {step.title}
                  </p>
                  <p
                    className={`text-sm ${
                      step.completed
                        ? 'text-green-600'
                        : isActive
                        ? 'text-gray-600'
                        : 'text-gray-400'
                    }`}
                  >
                    {step.completed ? 'Completed' : step.description}
                  </p>
                </div>

                {/* Action Button */}
                {isActive && step.href && step.cta && (
                  <Link href={step.href}>
                    <Button size="sm">{step.cta}</Button>
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        {/* Progress indicator */}
        <div className="mt-6 pt-4 border-t">
          <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
            <span>Progress</span>
            <span>
              {steps.filter((s) => s.completed).length} of {steps.length} complete
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{
                width: `${(steps.filter((s) => s.completed).length / steps.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
