'use client';

import { CloudArrowUpIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useCallback, useRef, useState } from 'react';

interface UploadedFile {
  id: string;
  file: File;
  preview?: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
  path?: string;
}

interface FileUploadProps {
  driverId: string;
  onUploadComplete?: (files: UploadedFile[]) => void;
  maxFiles?: number;
  maxFileSize?: number; // in MB
}

export default function FileUpload({ 
  driverId, 
  onUploadComplete, 
  maxFiles = 10, 
  maxFileSize = 50 
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateFileId = () => Math.random().toString(36).substr(2, 9);

  const validateFile = useCallback((file: File): string | null => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/bmp', 'image/tiff'];
    
    if (!allowedTypes.includes(file.type)) {
      return 'Only image files are allowed (JPEG, PNG, WebP, BMP, TIFF)';
    }
    
    if (file.size > maxFileSize * 1024 * 1024) {
      return `File size must be less than ${maxFileSize}MB`;
    }
    
    return null;
  }, [maxFileSize]);

  const createFilePreview = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });
  };

  const addFiles = useCallback(async (newFiles: File[]) => {
    if (files.length + newFiles.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const validatedFiles: UploadedFile[] = [];
    
    for (const file of newFiles) {
      const error = validateFile(file);
      const id = generateFileId();
      
      if (error) {
        validatedFiles.push({
          id,
          file,
          status: 'error',
          progress: 0,
          error
        });
      } else {
        const preview = await createFilePreview(file);
        validatedFiles.push({
          id,
          file,
          preview,
          status: 'pending',
          progress: 0
        });
      }
    }

    setFiles(prev => [...prev, ...validatedFiles]);
  }, [files.length, maxFiles, validateFile]);

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      addFiles(selectedFiles);
    }
  };

  const uploadFiles = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    console.log('Upload Files clicked. Pending files:', pendingFiles.length);
    console.log('All files:', files);
    if (pendingFiles.length === 0) {
      console.log('No pending files to upload');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('driverId', driverId);
      
      pendingFiles.forEach(fileItem => {
        formData.append('files', fileItem.file);
      });

      // Update status to uploading
      setFiles(prev => prev.map(f => 
        f.status === 'pending' ? { ...f, status: 'uploading', progress: 0 } : f
      ));

      // Simulate progress (in real implementation, you might use XMLHttpRequest for progress tracking)
      const progressInterval = setInterval(() => {
        setFiles(prev => prev.map(f => 
          f.status === 'uploading' ? { ...f, progress: Math.min(f.progress + 10, 90) } : f
        ));
      }, 200);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const uploadResult = await response.json();
      console.log('Upload API result:', uploadResult);
      console.log('uploadResult.files:', uploadResult.files);
      console.log('uploadResult.files length:', uploadResult.files?.length);

      // Create updated files with paths from the upload result
      const updatedFiles = files.map((f, index) => {
        if (f.status === 'uploading') {
          const uploadedFile = uploadResult.files && uploadResult.files[index];
          console.log(`Processing file ${index} (${f.file.name}):`, uploadedFile);
          if (uploadedFile?.path) {
            console.log(`Setting Supabase path for file ${f.file.name}: ${uploadedFile.path}`);
            return { 
              ...f, 
              status: 'completed' as const, 
              progress: 100,
              path: uploadedFile.path
            };
          } else {
            console.error(`No Supabase path available for file ${f.file.name}`, uploadedFile);
            return {
              ...f,
              status: 'error' as const,
              progress: 0,
              path: undefined
            };
          }
        }
        return f;
      });
      
      console.log('Updated files with paths:', updatedFiles);
      setFiles(updatedFiles);

      // Call onUploadComplete with the updated files
      console.log('Calling onUploadComplete with:', updatedFiles);
      onUploadComplete?.(updatedFiles);

    } catch (error) {
      console.error('Upload failed:', error);
      
      // Update uploading files to error
      setFiles(prev => prev.map(f => 
        f.status === 'uploading' ? { 
          ...f, 
          status: 'error', 
          progress: 0, 
          error: error instanceof Error ? error.message : 'Upload failed'
        } : f
      ));
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusColor = (status: UploadedFile['status']) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'uploading': return 'text-blue-600 bg-blue-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: UploadedFile['status']) => {
    switch (status) {
      case 'completed': return 'Uploaded';
      case 'uploading': return 'Uploading...';
      case 'error': return 'Failed';
      default: return 'Ready';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Drop Zone */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragging 
            ? 'border-primary-400 bg-primary-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${isUploading ? 'opacity-50 pointer-events-none' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileInput}
          className="hidden"
        />
        
        <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-semibold text-gray-900">
          Drop screenshot images here
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          Or click to select files • Max {maxFiles} files • Up to {maxFileSize}MB each
        </p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mt-4 btn-primary"
          disabled={isUploading}
        >
          Select Files
        </button>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900">
              Files ({files.length}/{maxFiles})
            </h4>
            <div className="flex space-x-2">
              <button
                onClick={() => setFiles([])}
                className="btn-secondary text-sm"
                disabled={isUploading}
              >
                Clear All
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  console.log('Upload button clicked!');
                  console.log('Is uploading:', isUploading);
                  console.log('Pending files:', files.filter(f => f.status === 'pending').length);
                  uploadFiles();
                }}
                disabled={isUploading || !files.some(f => f.status === 'pending')}
                className="btn-primary text-sm"
              >
                {isUploading ? 'Uploading...' : 'Upload Files'}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {files.map((fileItem) => (
              <div key={fileItem.id} className="flex items-center p-4 bg-white border rounded-lg shadow-sm">
                <div className="flex-shrink-0">
                  {fileItem.preview ? (
                    <img
                      src={fileItem.preview}
                      alt={fileItem.file.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                      <PhotoIcon className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 ml-4 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {fileItem.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(fileItem.file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  {fileItem.error && (
                    <p className="text-xs text-red-600 mt-1">{fileItem.error}</p>
                  )}
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(fileItem.status)}`}>
                      {getStatusText(fileItem.status)}
                    </span>
                  </div>
                  
                  {fileItem.status === 'uploading' && (
                    <div className="w-20">
                      <div className="bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${fileItem.progress}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 text-center mt-1">
                        {fileItem.progress}%
                      </p>
                    </div>
                  )}
                  
                  <button
                    onClick={() => removeFile(fileItem.id)}
                    disabled={isUploading}
                    className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-50"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}