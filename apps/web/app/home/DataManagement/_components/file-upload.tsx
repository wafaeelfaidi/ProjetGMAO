'use client';

import { Button } from '@kit/ui/button';
import { Label } from '@kit/ui/label';
import { Switch } from '@kit/ui/switch';
import { Upload } from 'lucide-react';
import { useCallback, useState } from 'react';

interface FileUploadProps {
  onFilesSelected: (files: File[], isPublic: boolean) => void;
  accept?: string;
  maxSizeMB?: number;
}

export function FileUpload({
  onFilesSelected,
  accept = '.pdf,.txt,.docx,.csv',
  maxSizeMB = 50,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isPublic, setIsPublic] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const validateAndProcess = useCallback(
    (files: File[]) => {
      console.log('🔄 validateAndProcess called, isPublic state:', isPublic);
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      const validFiles = files.filter((file) => {
        if (file.size > maxSizeBytes) {
          alert(`${file.name} exceeds ${maxSizeMB}MB limit`);
          return false;
        }
        return true;
      });

      if (validFiles.length > 0) {
        console.log('✅ Calling onFilesSelected with isPublic:', isPublic);
        onFilesSelected(validFiles, isPublic);
      }
    },
    [maxSizeMB, isPublic, onFilesSelected],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      validateAndProcess(files);
    },
    [validateAndProcess],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const files = Array.from(e.target.files);
        validateAndProcess(files);
      }
    },
    [validateAndProcess],
  );

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

        {/* Public/Private Toggle */}
        <div className="flex items-center space-x-2 pt-2 border-t">
          <Switch
            id="public-toggle"
            checked={isPublic}
            onCheckedChange={setIsPublic}
          />
          <Label htmlFor="public-toggle" className="cursor-pointer text-sm">
            {isPublic ? (
              <span className="text-green-600 font-medium">📢 Public - Anyone can view</span>
            ) : (
              <span className="text-gray-600">🔒 Private - Only you can view</span>
            )}
          </Label>
        </div>
      </div>
    </div>
  );
}
