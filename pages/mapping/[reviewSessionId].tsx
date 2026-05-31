import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Header } from '../../components/Header';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { SubscriptionGuard } from '../../components/SubscriptionGuard';
import { CANONICAL_FIELDS } from '../../lib/canonicalSchema';
import { supabase } from '../../lib/supabase';

interface ColumnMapping {
  uploadedColumn: string;
  canonicalField: string | null;
  confidence: number;
  reasoning: string;
}

interface MappingState {
  loading: boolean;
  submitting: boolean;
  error: string | null;
  baselineMappings: ColumnMapping[];
  currentMappings: ColumnMapping[];
  originalBaselineMappings: ColumnMapping[];
  originalCurrentMappings: ColumnMapping[];
  method: string;
}

const REQUIRED_CANONICAL_FIELDS = ['employee_id', 'gross_pay', 'net_pay', 'total_deductions'];

const canonicalOptions = CANONICAL_FIELDS
  .filter(f => f.dataType !== 'array')
  .map(f => ({ value: f.name, label: f.label, category: f.category }));

function confidenceColor(confidence: number): string {
  if (confidence >= 0.9) return 'text-green-700 bg-green-50';
  if (confidence >= 0.7) return 'text-yellow-700 bg-yellow-50';
  return 'text-red-700 bg-red-50';
}

function confidenceLabel(confidence: number): string {
  if (confidence >= 0.9) return 'High';
  if (confidence >= 0.7) return 'Medium';
  if (confidence > 0) return 'Low';
  return 'None';
}

function MappingTable({
  title,
  mappings,
  originalSuggestions,
  onUpdate,
  onReset,
}: {
  title: string;
  mappings: ColumnMapping[];
  originalSuggestions: ColumnMapping[];
  onUpdate: (index: number, canonicalField: string | null) => void;
  onReset: (index: number) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-medium text-gray-700">Uploaded Column</th>
                <th className="text-left py-2 px-3 font-medium text-gray-700">Mapped To</th>
                <th className="text-left py-2 px-3 font-medium text-gray-700">Confidence</th>
                <th className="text-left py-2 px-3 font-medium text-gray-700">Reasoning</th>
              </tr>
            </thead>
            <tbody>
              {mappings.map((m, i) => {
                const isRequired = m.canonicalField
                  ? REQUIRED_CANONICAL_FIELDS.includes(m.canonicalField)
                  : false;
                const originalField = originalSuggestions[i]?.canonicalField ?? null;
                const hasChanged = m.canonicalField !== originalField;
                return (
                  <tr
                    key={i}
                    className={`border-b border-gray-100 ${
                      m.confidence < 0.7 && m.confidence > 0 ? 'bg-amber-50/50' : ''
                    } ${!m.canonicalField ? 'bg-gray-50/50' : ''}`}
                  >
                    <td className="py-2 px-3 font-mono text-xs">{m.uploadedColumn}</td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1">
                          <div className="flex items-center gap-1 mb-0.5">
                            {isRequired && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700 leading-none">
                                Required
                              </span>
                            )}
                          </div>
                          <select
                            value={m.canonicalField || ''}
                            onChange={(e) => onUpdate(i, e.target.value || null)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">-- Skip (unmapped) --</option>
                            {canonicalOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label} ({opt.category})
                              </option>
                            ))}
                          </select>
                        </div>
                        {hasChanged && (
                          <button
                            type="button"
                            title="Reset to AI suggestion"
                            onClick={() => onReset(i)}
                            className="flex-shrink-0 text-gray-400 hover:text-blue-600 transition-colors text-base leading-none p-1 rounded hover:bg-blue-50"
                          >
                            ↺
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${confidenceColor(
                          m.confidence,
                        )}`}
                      >
                        {confidenceLabel(m.confidence)} ({(m.confidence * 100).toFixed(0)}%)
                      </span>
                    </td>
                    <td className="py-2 px-3 text-xs text-gray-500 max-w-[200px] truncate">
                      {m.reasoning}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MappingPage() {
  const router = useRouter();
  const { reviewSessionId } = router.query;

  const [state, setState] = useState<MappingState>({
    loading: true,
    submitting: false,
    error: null,
    baselineMappings: [],
    currentMappings: [],
    originalBaselineMappings: [],
    originalCurrentMappings: [],
    method: '',
  });

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const { data: { session: authSession } } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      ...(authSession?.access_token ? { Authorization: `Bearer ${authSession.access_token}` } : {}),
    };
  };

  useEffect(() => {
    if (!reviewSessionId) return;

    const fetchMappings = async () => {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch('/api/map-columns', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            reviewSessionId,
            extractFromSession: true,
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to fetch mapping suggestions');
        }

        const data = await res.json();
        const baselineMappings: ColumnMapping[] = data.baseline?.mappings || [];
        const currentMappings: ColumnMapping[] = data.current?.mappings || [];
        setState((prev) => ({
          ...prev,
          loading: false,
          baselineMappings,
          currentMappings,
          originalBaselineMappings: baselineMappings.map((m) => ({ ...m })),
          originalCurrentMappings: currentMappings.map((m) => ({ ...m })),
          method: data.baseline?.method || 'mock',
        }));
      } catch (err: any) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err.message,
        }));
      }
    };

    fetchMappings();
  }, [reviewSessionId]);

  const handleUpdateBaseline = (index: number, canonicalField: string | null) => {
    setState((prev) => {
      const updated = [...prev.baselineMappings];
      updated[index] = { ...updated[index], canonicalField, confidence: canonicalField ? 1.0 : 0 };
      return { ...prev, baselineMappings: updated };
    });
  };

  const handleUpdateCurrent = (index: number, canonicalField: string | null) => {
    setState((prev) => {
      const updated = [...prev.currentMappings];
      updated[index] = { ...updated[index], canonicalField, confidence: canonicalField ? 1.0 : 0 };
      return { ...prev, currentMappings: updated };
    });
  };

  const handleResetBaseline = (index: number) => {
    setState((prev) => {
      const updated = [...prev.baselineMappings];
      const original = prev.originalBaselineMappings[index];
      if (original) {
        updated[index] = { ...original };
      }
      return { ...prev, baselineMappings: updated };
    });
  };

  const handleResetCurrent = (index: number) => {
    setState((prev) => {
      const updated = [...prev.currentMappings];
      const original = prev.originalCurrentMappings[index];
      if (original) {
        updated[index] = { ...original };
      }
      return { ...prev, currentMappings: updated };
    });
  };

  const handleConfirm = async () => {
    // Validate required canonical fields are mapped in BOTH datasets
    const getMapped = (mappings: ColumnMapping[]) =>
      new Set(mappings.map((m) => m.canonicalField).filter(Boolean));

    const baselineMapped = getMapped(state.baselineMappings);
    const currentMapped = getMapped(state.currentMappings);
    const missingInBaseline = REQUIRED_CANONICAL_FIELDS.filter((f) => !baselineMapped.has(f));
    const missingInCurrent = REQUIRED_CANONICAL_FIELDS.filter((f) => !currentMapped.has(f));

    if (missingInBaseline.length > 0 || missingInCurrent.length > 0) {
      const missing = [...new Set([...missingInBaseline, ...missingInCurrent])];
      toast.error('Required fields not mapped', {
        description: `Please map these required fields before confirming: ${missing.join(', ')}`,
        duration: 6000,
      });
      setState((prev) => ({
        ...prev,
        error: `Required fields not mapped: ${missing.join(', ')}. These are needed for the rules engine to function correctly.`,
      }));
      return;
    }

    setState((prev) => ({ ...prev, submitting: true, error: null }));
    toast.loading('Processing with confirmed mappings...', { id: 'confirm' });

    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/confirm-mapping', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          reviewSessionId,
          baselineMappings: state.baselineMappings.map((m) => ({
            uploadedColumn: m.uploadedColumn,
            canonicalField: m.canonicalField,
          })),
          currentMappings: state.currentMappings.map((m) => ({
            uploadedColumn: m.uploadedColumn,
            canonicalField: m.canonicalField,
          })),
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to confirm mapping');
      }

      const result = await res.json();

      // processing_started is only true when an external async processor is configured (legacy path)
      if (result.processing_started) {
        toast.loading('Analyzing payroll changes...', { id: 'confirm' });

        pollRef.current = setInterval(async () => {
          try {
            const pollHeaders = await getAuthHeaders();
            const pollRes = await fetch(`/api/review/${reviewSessionId}`, { headers: pollHeaders });
            if (pollRes.ok) {
              const data = await pollRes.json();
              if (data.session?.status === 'completed' || data.verdict) {
                if (pollRef.current) clearInterval(pollRef.current);
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                toast.success('Analysis complete!', {
                  id: 'confirm',
                  description: 'Redirecting to review page...',
                });
                setState((prev) => ({ ...prev, submitting: false }));
                router.push(`/review/${reviewSessionId}`);
              }
            }
          } catch {
            // Ignore polling errors, will retry
          }
        }, 3000);

        timeoutRef.current = setTimeout(() => {
          if (pollRef.current) clearInterval(pollRef.current);
          toast.error('Processing timed out', { id: 'confirm' });
          setState((prev) => ({
            ...prev,
            submitting: false,
            error: 'Processing timed out. Please refresh and check your review sessions.',
          }));
        }, 300000);

        return;
      }

      // Inline processing completed
      toast.success('Processing complete!', {
        id: 'confirm',
        description: 'Redirecting to review page...',
      });

      router.push(`/review/${reviewSessionId}`);
    } catch (err: any) {
      toast.error('Processing failed', {
        id: 'confirm',
        description: err.message,
      });
      setState((prev) => ({ ...prev, submitting: false, error: err.message }));
    }
  };

  const mappedCount = state.baselineMappings.filter((m) => m.canonicalField).length +
    state.currentMappings.filter((m) => m.canonicalField).length;
  const totalCount = state.baselineMappings.length + state.currentMappings.length;

  return (
    <ProtectedRoute>
      <Head>
        <title>Column Mapping - PayrollShield</title>
        <meta name="description" content="Review and confirm column mappings for your payroll data" />
      </Head>

      <SubscriptionGuard loadingBehavior="pass">
      <Header />

      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Column Mapping</h1>
            <p className="text-gray-600">
              Review the suggested column mappings below. Adjust any incorrect mappings using the
              dropdowns, then confirm to process your payroll data.
            </p>
            {state.method && (
              <p className="text-xs text-gray-400 mt-1">
                Mapping method: {state.method === 'ai' ? 'AI (GPT-4o-mini)' : 'Fuzzy matching'}
              </p>
            )}
          </div>

          {state.error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 font-medium">Error: {state.error}</p>
            </div>
          )}

          {state.loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3" />
              <span className="text-gray-600">Analyzing columns...</span>
            </div>
          ) : (
            <>
              <div className="mb-4 p-3 bg-white border border-gray-200 rounded-lg flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {mappedCount} of {totalCount} columns mapped
                </span>
                <div className="flex gap-3 text-xs">
                  <span className="px-2 py-1 bg-green-50 text-green-700 rounded">High confidence</span>
                  <span className="px-2 py-1 bg-yellow-50 text-yellow-700 rounded">Medium — verify</span>
                  <span className="px-2 py-1 bg-red-50 text-red-700 rounded">Low — needs attention</span>
                </div>
              </div>

              <div className="space-y-6 mb-8">
                <MappingTable
                  title="Baseline Dataset Columns"
                  mappings={state.baselineMappings}
                  originalSuggestions={state.originalBaselineMappings}
                  onUpdate={handleUpdateBaseline}
                  onReset={handleResetBaseline}
                />
                <MappingTable
                  title="Current Dataset Columns"
                  mappings={state.currentMappings}
                  originalSuggestions={state.originalCurrentMappings}
                  onUpdate={handleUpdateCurrent}
                  onReset={handleResetCurrent}
                />
              </div>

              <div className="flex justify-between items-center">
                <Button variant="outline" onClick={() => router.push('/upload')}>
                  Back to Upload
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={state.submitting}
                  size="lg"
                  className="min-w-[250px]"
                >
                  {state.submitting ? 'Processing...' : 'Confirm Mapping & Process'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
      </SubscriptionGuard>
    </ProtectedRoute>
  );
}
