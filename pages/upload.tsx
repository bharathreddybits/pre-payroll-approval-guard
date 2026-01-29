import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useDropzone } from 'react-dropzone';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

interface UploadState {
  baselineFile: File | null;
  currentFile: File | null;
  organizationId: string;
  periodStartDate: string;
  periodEndDate: string;
  payDate: string;
  runType: 'regular' | 'off_cycle';
  uploading: boolean;
  processing: boolean;
  error: string | null;
  warnings: string[];
}

export default function UploadPage() {
  const router = useRouter();

  const [state, setState] = useState<UploadState>({
    baselineFile: null,
    currentFile: null,
    organizationId: '',
    periodStartDate: '',
    periodEndDate: '',
    payDate: '',
    runType: 'regular',
    uploading: false,
    processing: false,
    error: null,
    warnings: [],
  });

  const baselineDropzone = useDropzone({
    accept: {
      'text/csv': ['.csv'],
    },
    multiple: false,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setState((prev) => ({ ...prev, baselineFile: acceptedFiles[0], error: null }));
      }
    },
  });

  const currentDropzone = useDropzone({
    accept: {
      'text/csv': ['.csv'],
    },
    multiple: false,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setState((prev) => ({ ...prev, currentFile: acceptedFiles[0], error: null }));
      }
    },
  });

  const handleUpload = async () => {
    // Validation
    if (!state.baselineFile || !state.currentFile) {
      setState((prev) => ({ ...prev, error: 'Please upload both baseline and current CSV files' }));
      return;
    }

    if (!state.organizationId || !state.periodStartDate || !state.periodEndDate || !state.payDate) {
      setState((prev) => ({ ...prev, error: 'Please fill in all required fields' }));
      return;
    }

    setState((prev) => ({ ...prev, uploading: true, error: null, warnings: [] }));

    try {
      // Step 1: Upload files
      const formData = new FormData();
      formData.append('baseline', state.baselineFile);
      formData.append('current', state.currentFile);
      formData.append('organizationId', state.organizationId);
      formData.append('periodStartDate', state.periodStartDate);
      formData.append('periodEndDate', state.periodEndDate);
      formData.append('payDate', state.payDate);
      formData.append('runType', state.runType);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const uploadResult = await uploadResponse.json();
      const reviewSessionId = uploadResult.review_session_id;

      // Store warnings if any
      if (uploadResult.warnings && uploadResult.warnings.length > 0) {
        setState((prev) => ({ ...prev, warnings: uploadResult.warnings }));
      }

      // Check processing result
      if (uploadResult.processing && uploadResult.processing.success) {
        console.log('Processing completed:', uploadResult.processing);
      } else {
        console.warn('Processing may have failed:', uploadResult.processing);
        // Still proceed to review page - user can see results there
      }

      // Success! Navigate to review page (processing already completed in upload API)
      setState((prev) => ({ ...prev, uploading: false, processing: false }));
      router.push(`/review/${reviewSessionId}`);
    } catch (error: any) {
      console.error('Upload/processing error:', error);
      setState((prev) => ({
        ...prev,
        uploading: false,
        processing: false,
        error: error.message || 'Failed to process payroll data',
      }));
    }
  };

  const renderDropzone = (
    dropzone: any,
    file: File | null,
    label: string,
    description: string
  ) => (
    <div
      {...dropzone.getRootProps()}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
        dropzone.isDragActive
          ? 'border-primary bg-primary/5'
          : file
          ? 'border-green-500 bg-green-50'
          : 'border-gray-300 hover:border-primary'
      }`}
    >
      <input {...dropzone.getInputProps()} />
      <div className="flex flex-col items-center gap-2">
        {file ? (
          <>
            <div className="text-4xl">✓</div>
            <p className="font-semibold text-green-700">{file.name}</p>
            <p className="text-sm text-gray-600">{(file.size / 1024).toFixed(2)} KB</p>
            <p className="text-xs text-gray-500">Click to replace</p>
          </>
        ) : (
          <>
            <div className="text-4xl text-gray-400">📄</div>
            <p className="font-semibold text-gray-700">{label}</p>
            <p className="text-sm text-gray-500">{description}</p>
            <p className="text-xs text-gray-400 mt-2">
              Click to browse or drag and drop CSV file here
            </p>
          </>
        )}
      </div>
    </div>
  );

  const isFormValid =
    state.baselineFile &&
    state.currentFile &&
    state.organizationId &&
    state.periodStartDate &&
    state.periodEndDate &&
    state.payDate;

  return (
    <>
      <Head>
        <title>Upload Payroll Data - Pre-Payroll Approval Guard</title>
        <meta name="description" content="Upload baseline and current payroll CSV files for comparison" />
      </Head>

      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Upload Payroll Data</h1>
            <p className="text-gray-600">
              Upload your baseline (previously approved) and current payroll CSV files for
              comparison and review.
            </p>
          </div>

          {/* Error Display */}
          {state.error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 font-medium">Error: {state.error}</p>
            </div>
          )}

          {/* Warnings Display */}
          {state.warnings.length > 0 && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-900 font-medium mb-2">Warnings:</p>
              <ul className="list-disc list-inside text-yellow-800 text-sm space-y-1">
                {state.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Main Form */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Payroll Information</CardTitle>
              <CardDescription>
                Provide details about the payroll period and organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Organization ID *
                  </label>
                  <input
                    type="text"
                    value={state.organizationId}
                    onChange={(e) =>
                      setState((prev) => ({ ...prev, organizationId: e.target.value }))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="e.g., org_123456"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Run Type *
                  </label>
                  <select
                    value={state.runType}
                    onChange={(e) =>
                      setState((prev) => ({
                        ...prev,
                        runType: e.target.value as 'regular' | 'off_cycle',
                      }))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="regular">Regular</option>
                    <option value="off_cycle">Off-Cycle</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Period Start Date *
                  </label>
                  <input
                    type="date"
                    value={state.periodStartDate}
                    onChange={(e) =>
                      setState((prev) => ({ ...prev, periodStartDate: e.target.value }))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Period End Date *
                  </label>
                  <input
                    type="date"
                    value={state.periodEndDate}
                    onChange={(e) =>
                      setState((prev) => ({ ...prev, periodEndDate: e.target.value }))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pay Date *
                  </label>
                  <input
                    type="date"
                    value={state.payDate}
                    onChange={(e) => setState((prev) => ({ ...prev, payDate: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* File Upload Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Baseline File */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Baseline Payroll</CardTitle>
                <CardDescription>Previously approved payroll data</CardDescription>
              </CardHeader>
              <CardContent>
                {renderDropzone(
                  baselineDropzone,
                  state.baselineFile,
                  'Upload Baseline CSV',
                  'Previously approved payroll data'
                )}
              </CardContent>
            </Card>

            {/* Current File */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Current Payroll</CardTitle>
                <CardDescription>New payroll data to review</CardDescription>
              </CardHeader>
              <CardContent>
                {renderDropzone(
                  currentDropzone,
                  state.currentFile,
                  'Upload Current CSV',
                  'New payroll data to review'
                )}
              </CardContent>
            </Card>
          </div>

          {/* CSV Requirements */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">CSV File Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600 space-y-2">
                <p className="font-medium">Required columns:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>employee_id</li>
                  <li>gross_pay</li>
                  <li>deductions (or total_deductions)</li>
                  <li>net_pay</li>
                </ul>
                <p className="font-medium mt-3">Optional columns:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>employee_name</li>
                  <li>department</li>
                  <li>hours_worked</li>
                  <li>rate</li>
                  <li>employment_status</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={() => router.push('/')}>
              Cancel
            </Button>

            <Button
              onClick={handleUpload}
              disabled={!isFormValid || state.uploading || state.processing}
              size="lg"
              className="min-w-[200px]"
            >
              {state.uploading
                ? 'Uploading...'
                : state.processing
                ? 'Processing...'
                : 'Upload & Process'}
            </Button>
          </div>

          {/* Processing Status */}
          {(state.uploading || state.processing) && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <div>
                  <p className="font-medium text-blue-900">
                    {state.uploading ? 'Uploading files...' : 'Processing comparison...'}
                  </p>
                  <p className="text-sm text-blue-700">
                    {state.uploading
                      ? 'Validating and storing payroll data'
                      : 'Calculating differences and applying judgement rules'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
