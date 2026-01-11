'use client';

import { Button } from '@kit/ui/button';
import { Upload } from 'lucide-react';
import { useCallback, useState } from 'react';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  maxSizeMB?: number;
}

export function FileUpload({
  onFilesSelected,
  accept = '.pdf,.txt,.docx,.csv',
  maxSizeMB = 50,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      validateAndProcess(files);
    },
    [maxSizeMB],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const files = Array.from(e.target.files);
        validateAndProcess(files);
      }
    },
    [maxSizeMB],
  );

  const validateAndProcess = (files: File[]) => {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    const validFiles = files.filter((file) => {
      if (file.size > maxSizeBytes) {
        alert(`${file.name} exceeds ${maxSizeMB}MB limit`);
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  };

  return (
    <div
      className={`
        relative border-2 border-dashed rounded-lg p-8 text-center
        transition-colors duration-200
        ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-gray-300 hover:border-gray-400'
        }
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        multiple
        accept={accept}
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />

      <div className="flex flex-col items-center gap-4">
        <div className="p-4 bg-gray-100 rounded-full">
          <Upload className="w-8 h-8 text-gray-600" />
        </div>

        <div>
          <p className="text-lg font-medium">
            {isDragging ? 'Drop files here' : 'Drag & drop files here'}
          </p>
          <p className="text-sm text-gray-500 mt-1">or click to browse</p>
        </div>

        <div className="text-xs text-gray-500">
          <p>Supported formats: PDF, TXT, DOCX, CSV</p>
          <p>Maximum size: {maxSizeMB}MB per file</p>
        </div>
      </div>
    </div>
  );
}
