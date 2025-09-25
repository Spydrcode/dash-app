'use client';

import { Dialog, Transition } from '@headlessui/react';
import { CheckCircleIcon, ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Fragment, useState } from 'react';
import FileUpload from './FileUpload';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  driverId: string;
}

export default function UploadModal({ isOpen, onClose, driverId }: UploadModalProps) {
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadedCount, setUploadedCount] = useState(0);

  const handleUploadComplete = (files: any[]) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    setUploadedCount(files.length);
    setUploadStatus('success');
    
    // Auto-close after success
    setTimeout(() => {
      handleClose();
    }, 2000);
  };

  const handleClose = () => {
    setUploadStatus('idle');
    setUploadedCount(0);
    onClose();
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 flex items-center justify-between"
                >
                  <div className="flex items-center">
                    <span>Upload Trip Screenshots</span>
                    {uploadStatus === 'success' && (
                      <CheckCircleIcon className="w-6 h-6 text-green-600 ml-2" />
                    )}
                    {uploadStatus === 'error' && (
                      <ExclamationTriangleIcon className="w-6 h-6 text-red-600 ml-2" />
                    )}
                  </div>
                  <button
                    onClick={handleClose}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </Dialog.Title>
                
                <div className="mt-4">
                  {uploadStatus === 'success' ? (
                    <div className="text-center py-8">
                      <CheckCircleIcon className="mx-auto h-16 w-16 text-green-600" />
                      <h3 className="mt-4 text-lg font-semibold text-gray-900">
                        Upload Successful!
                      </h3>
                      <p className="mt-2 text-gray-600">
                        {uploadedCount} file{uploadedCount !== 1 ? 's' : ''} uploaded successfully.
                        They will be processed and appear in your trip history soon.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="mb-6">
                        <p className="text-sm text-gray-600">
                          Upload screenshots from your delivery apps to automatically extract trip data.
                          Take screenshots at pickup and delivery to capture earnings, tips, and distance.
                        </p>
                      </div>
                      
                      <FileUpload
                        driverId={driverId}
                        onUploadComplete={handleUploadComplete}
                        maxFiles={10}
                        maxFileSize={50}
                      />
                      
                      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-semibold text-blue-900 mb-2">Tips for Best Results:</h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                          <li>• Take clear, well-lit screenshots</li>
                          <li>• Include the entire earnings/trip summary screen</li>
                          <li>• Capture both pickup and delivery confirmations</li>
                          <li>• Make sure text is readable and not blurry</li>
                        </ul>
                      </div>
                    </>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}