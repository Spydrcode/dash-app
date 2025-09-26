'use client';

import FileUpload from '@/components/FileUpload';
import ProcessingResults from '@/components/ProcessingResults';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface UploadedFile {
  id: string;
  file: File;
  preview?: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
  path?: string;
  imageType?: 'dashboard' | 'initial_offer' | 'final_receipt' | 'navigation' | 'unknown'; // Add image type
}

export default function UploadPage() {
  const router = useRouter();
  const [driverId] = useState('550e8400-e29b-41d4-a716-446655440000'); // Mock driver ID
  const [uploadComplete, setUploadComplete] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showingResults, setShowingResults] = useState(false);
  const [selectedFileForProcessing, setSelectedFileForProcessing] = useState<string | null>(null);

  const handleUploadComplete = (files: UploadedFile[]) => {
    console.log('Upload complete! Files received:', files);
    console.log('Files with paths:', files.map(f => ({ name: f.file.name, path: f.path, status: f.status })));
    
    setUploadedFiles(files);
    setUploadComplete(true);
    
    // Check if any files were successfully uploaded
    const completedFiles = files.filter(f => f.status === 'completed');
    console.log('Completed files:', completedFiles.length);
    
    if (completedFiles.length > 0) {
      // Show success notification
      window.dispatchEvent(new CustomEvent('addNotification', {
        detail: {
          type: 'success',
          title: 'Insights Updated!',
          message: `${completedFiles.length} screenshot${completedFiles.length !== 1 ? 's' : ''} processed. AI insights have been updated with new trip data.`,
          autoClose: true,
          duration: 5000
        }
      }));
      
      // Trigger immediate dashboard refresh
      window.dispatchEvent(new CustomEvent('dashboardRefresh'));
      
      // Trigger delayed AI insights refresh to ensure OCR processing completes
      setTimeout(() => {
        console.log('Upload page: Triggering delayed AI insights refresh after OCR processing');
        window.dispatchEvent(new CustomEvent('dashboardRefresh'));
      }, 4000);
      
      // Redirect to main dashboard after a short delay to show the notification
      setTimeout(() => {
        console.log('Redirecting to dashboard...');
        // Use window.location for more reliable navigation in production
        window.location.href = '/';
      }, 2000);
    } else {
      console.log('No completed files found - upload may have failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <Link 
                href="/" 
                className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Upload Screenshots</h1>
                <p className="text-gray-600">Upload trip screenshots for automatic data extraction</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {uploadComplete && !showingResults ? (
          <div className="text-center py-16">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mt-4 text-2xl font-bold text-gray-900">Upload Successful!</h2>
            <p className="mt-2 text-gray-600">
              {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} uploaded successfully.
              AI processing will begin automatically.
            </p>
            <div className="mt-6 space-x-4">
              <Link href="/" className="btn-primary">
                Back to Dashboard
              </Link>
              <button 
                onClick={() => {
                  setUploadComplete(false);
                  setUploadedFiles([]);
                  setShowingResults(false);
                  setSelectedFileForProcessing(null);
                }} 
                className="btn-secondary"
              >
                Upload More
              </button>
              {uploadedFiles.length > 0 && (
                <button
                  onClick={async () => {
                    console.log('View AI Results clicked!');
                    console.log('uploadedFiles count:', uploadedFiles.length);
                    console.log('uploadedFiles full objects:', uploadedFiles);
                    console.log('uploadedFiles detailed:', uploadedFiles.map(f => ({ 
                      name: f.file.name, 
                      status: f.status, 
                      path: f.path,
                      pathType: typeof f.path,
                      pathLength: f.path ? f.path.length : 'no path',
                      hasPath: !!f.path,
                      fullObject: f
                    })));
                    console.log('selectedFileForProcessing before:', selectedFileForProcessing);
                    
                    // Check if we have any uploaded files with paths (regardless of status)
                    const fileWithPath = uploadedFiles.find(f => {
                      console.log(`Checking file ${f.file.name}: path="${f.path}", hasPath=${!!f.path}`);
                      return f.path && f.path.trim().length > 0;
                    });
                    
                    console.log('fileWithPath found:', fileWithPath);
                    
                    // If we have files with paths, use them
                    if (fileWithPath && fileWithPath.path) {
                      if (!selectedFileForProcessing) {
                        console.log('Setting selectedFileForProcessing to:', fileWithPath.path);
                        setSelectedFileForProcessing(fileWithPath.path);
                      }
                      console.log('Setting showingResults to true');
                      setShowingResults(true);
                    } else {
                      console.log('No files with paths found, trying database check...');
                      // If no completed files, check if we have any trips in the database
                      try {
                        const response = await fetch('/api/unified-mcp', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            action: 'ai_insights',
                            timeframe: 'all'
                          })
                        });
                        
                        if (response.ok) {
                          const data = await response.json();
                          console.log('Database check response:', data);
                          if (data.summary && data.summary.total_trips > 0) {
                            console.log('Found processed trips in database, showing AI results');
                            setShowingResults(true);
                            return;
                          }
                        }
                      } catch (error) {
                        console.error('Error checking for processed trips:', error);
                      }
                      
                      console.log('No files or processed trips found - redirecting to dashboard');
                      // As a fallback, redirect to main dashboard which has AI insights
                      window.location.href = '/';
                    }
                  }}
                  className="btn-primary bg-purple-600 hover:bg-purple-700"
                >
                  View AI Results
                </button>
              )}
            </div>
          </div>
        ) : showingResults && selectedFileForProcessing ? (
          <div className="space-y-6">
            <button
              onClick={() => setShowingResults(false)}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Back to Upload
            </button>
            <ProcessingResults
              imagePath={selectedFileForProcessing}
              driverId={driverId}
              onClose={() => setShowingResults(false)}
            />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Upload Component */}
            <div className="bg-white rounded-lg shadow p-6">
              <FileUpload
                driverId={driverId}
                onUploadComplete={handleUploadComplete}
                maxFiles={10}
                maxFileSize={50}
              />
            </div>

            {/* Instructions */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">How to Get the Best Results</h3>
              </div>
              <div className="p-6">
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Screenshot Types to Capture</h4>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-primary-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                        <span><strong>Trip Summary:</strong> Final earnings screen after delivery completion</span>
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-primary-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                        <span><strong>Pickup Confirmation:</strong> Order accepted and pickup details</span>
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-primary-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                        <span><strong>Delivery Completion:</strong> Drop-off confirmation with tip amount</span>
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-primary-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                        <span><strong>Navigation:</strong> Distance/duration from your GPS app</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Quality Tips</h4>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-green-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                        <span>Take clear, well-lit screenshots</span>
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-green-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                        <span>Ensure all text is readable and not blurry</span>
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-green-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                        <span>Capture the entire screen, not just partial views</span>
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-green-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                        <span>Upload images soon after each trip for accuracy</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Supported Platforms</h4>
                  <div className="flex flex-wrap gap-2 text-sm">
                    <span className="bg-white px-3 py-1 rounded-full text-blue-800 border border-blue-200">DoorDash</span>
                    <span className="bg-white px-3 py-1 rounded-full text-blue-800 border border-blue-200">Uber Eats</span>
                    <span className="bg-white px-3 py-1 rounded-full text-blue-800 border border-blue-200">Grubhub</span>
                    <span className="bg-white px-3 py-1 rounded-full text-blue-800 border border-blue-200">Postmates</span>
                    <span className="bg-white px-3 py-1 rounded-full text-blue-800 border border-blue-200">Instacart</span>
                    <span className="bg-white px-3 py-1 rounded-full text-blue-800 border border-blue-200">And more...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}