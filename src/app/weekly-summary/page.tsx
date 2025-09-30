'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

interface ValidationResults {
  validation: {
    overallAccuracy: number;
  };
  discrepancies: Array<{
    type: string;
    severity: 'high' | 'medium' | 'low';
    description: string;
    recommendation: string;
  }>;
  summaryData: {
    totalTrips: number;
    totalEarnings: number;
    totalDistance: number;
    platform: string;
  };
  recommendations?: string[];
}

export default function WeeklySummaryUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [weekPeriod, setWeekPeriod] = useState('');
  const [validationResults, setValidationResults] = useState<ValidationResults | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Calculate current week period
  const getCurrentWeekPeriod = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const monday = new Date(today);
    monday.setDate(today.getDate() - dayOfWeek + 1);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    
    return `${formatDate(monday)} to ${formatDate(sunday)}`;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      setSelectedFile(file);
      setUploadStatus(null);
      setValidationResults(null);
      
      // Auto-set week period to current week if empty
      if (!weekPeriod) {
        setWeekPeriod(getCurrentWeekPeriod());
      }
    } else {
      setUploadStatus('Please select a valid image or PDF file');
    }
  };

  const calculateFileHash = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const uploadWeeklySummary = async () => {
    if (!selectedFile) {
      setUploadStatus('Please select a file to upload');
      return;
    }

    if (!weekPeriod) {
      setUploadStatus('Please specify the week period');
      return;
    }

    try {
      setIsUploading(true);
      setUploadStatus('Processing weekly summary validation...');
      setValidationResults(null);

      // Calculate file metadata for duplicate detection
      const fileHash = await calculateFileHash(selectedFile);
      const fileMetadata = {
        originalName: selectedFile.name,
        fileHash: fileHash,
        perceptualHash: fileHash.substring(0, 16), // Simplified perceptual hash
        fileSize: selectedFile.size
      };

      // Upload file to Supabase
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('folder', 'weekly-summaries');

      const uploadResponse = await fetch('/api/upload-file', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      const uploadResult = await uploadResponse.json();
      console.log('Weekly summary uploaded:', uploadResult);

      setUploadStatus('File uploaded successfully! Running AI validation...');

      // Process with Weekly Summary Validation Agent
      const validationResponse = await fetch('/api/validate-weekly-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imagePath: uploadResult.url,
          weekPeriod: weekPeriod,
          fileMetadata: fileMetadata
        }),
      });

      const validationResult = await validationResponse.json();
      
      if (validationResult.success) {
        setValidationResults(validationResult.data as ValidationResults);
        setUploadStatus(
          `✅ Weekly Summary Validated! Accuracy: ${(validationResult.data as ValidationResults).validation.overallAccuracy.toFixed(1)}%`
        );
        
        // Show results for a few seconds then redirect
        setTimeout(() => {
          const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
          
          if (isMobile) {
            // Mobile redirect with delay
            setTimeout(() => {
              try {
                router.replace('/');
              } catch (error) {
                try {
                  window.location.assign('/');
                } catch (fallback) {
                  window.location.href = '/';
                }
              }
            }, 1000);
          } else {
            // Desktop redirect
            router.push('/');
          }
        }, 3000);
      } else {
        setUploadStatus(`❌ Validation failed: ${validationResult.error || 'Unknown error'}`);
      }

    } catch (error) {
      console.error('Weekly summary upload error:', error);
      setUploadStatus(`❌ Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const formatDiscrepancy = (discrepancy: any) => {
    const severityColor = discrepancy.severity === 'high' ? 'text-red-600' : 
                         discrepancy.severity === 'medium' ? 'text-yellow-600' : 'text-blue-600';
    
    return (
      <div key={discrepancy.type} className={`p-3 rounded-lg border ${severityColor} bg-opacity-10`}>
        <div className="flex justify-between items-start mb-2">
          <span className="font-medium">{discrepancy.type.replace(/_/g, ' ').toUpperCase()}</span>
          <span className={`px-2 py-1 rounded text-xs font-medium ${severityColor} bg-current bg-opacity-20`}>
            {discrepancy.severity.toUpperCase()}
          </span>
        </div>
        <p className="text-sm text-gray-600 mb-2">{discrepancy.description}</p>
        <p className="text-xs font-medium">Recommendation: {discrepancy.recommendation}</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Weekly Summary Validation</h1>
          <p className="text-gray-600 mt-2">
            Upload your weekly rideshare summary to validate accuracy against individual trips
          </p>
        </div>

        {/* Upload Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="space-y-4">
            {/* Week Period Input */}
            <div>
              <label htmlFor="week-period" className="block text-sm font-medium text-gray-700 mb-2">
                Week Period
              </label>
              <input
                id="week-period"
                type="text"
                placeholder="2025-09-22 to 2025-09-28"
                value={weekPeriod}
                onChange={(e) => setWeekPeriod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={() => setWeekPeriod(getCurrentWeekPeriod())}
                className="mt-1 text-xs text-blue-600 hover:text-blue-800"
              >
                Use Current Week
              </button>
            </div>

            {/* File Upload */}
            <div>
              <label htmlFor="weekly-file" className="block text-sm font-medium text-gray-700 mb-2">
                Weekly Summary Screenshot
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <input
                  id="weekly-file"
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="space-y-2">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="text-sm text-gray-600">
                    {selectedFile ? (
                      <span className="font-medium text-green-600">Selected: {selectedFile.name}</span>
                    ) : (
                      <>
                        <span className="font-medium text-blue-600 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                          Click to upload
                        </span>
                        {' or drag and drop'}
                      </>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, PDF up to 10MB</p>
                </div>
              </div>
            </div>

            {/* Upload Button */}
            <button
              onClick={uploadWeeklySummary}
              disabled={!selectedFile || !weekPeriod || isUploading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isUploading ? 'Validating Weekly Summary...' : 'Validate Weekly Summary'}
            </button>

            {/* Status */}
            {uploadStatus && (
              <div className={`p-4 rounded-md ${uploadStatus.includes('✅') ? 'bg-green-50 text-green-800' : 
                                                uploadStatus.includes('❌') ? 'bg-red-50 text-red-800' : 
                                                'bg-blue-50 text-blue-800'}`}>
                {uploadStatus}
              </div>
            )}
          </div>
        </div>

        {/* Validation Results */}
        {validationResults && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Validation Results</h3>
            
            {/* Accuracy Summary */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {validationResults.validation?.overallAccuracy?.toFixed(1) || '0'}%
                </div>
                <div className="text-sm text-gray-600">Overall Accuracy</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {validationResults.discrepancies?.length || 0}
                </div>
                <div className="text-sm text-gray-600">Discrepancies Found</div>
              </div>
            </div>

            {/* Weekly Summary Data */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3">Weekly Summary Data</h4>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Total Trips:</span> {validationResults.summaryData?.totalTrips || 0}
                  </div>
                  <div>
                    <span className="font-medium">Total Earnings:</span> ${validationResults.summaryData?.totalEarnings?.toFixed(2) || '0.00'}
                  </div>
                  <div>
                    <span className="font-medium">Distance:</span> {validationResults.summaryData?.totalDistance?.toFixed(1) || '0.0'} mi
                  </div>
                  <div>
                    <span className="font-medium">Platform:</span> {validationResults.summaryData?.platform || 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* Discrepancies */}
            {validationResults.discrepancies && validationResults.discrepancies.length > 0 && (
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3">Discrepancies Found</h4>
                <div className="space-y-3">
                  {validationResults.discrepancies.map((discrepancy, index) => (
                    <div key={index}>{formatDiscrepancy(discrepancy)}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {validationResults.recommendations && validationResults.recommendations.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Recommendations</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  {validationResults.recommendations.map((rec: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">How Weekly Validation Works</h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>• Extracts data from your weekly rideshare summary screenshot</li>
            <li>• Cross-references with individual trip data from the same period</li>
            <li>• Identifies missing trips, earnings discrepancies, and data accuracy</li>
            <li>• Provides recommendations to improve data collection</li>
            <li>• Helps ensure complete and accurate trip records</li>
          </ul>
        </div>
      </div>
    </div>
  );
}