'use client';

import { Button } from '@kit/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { FileText, Trash2 } from 'lucide-react';
import { useMemo } from 'react';

interface FileListProps {
  files: Array<{
    id: string;
    name: string;
    type: string;
    size: number;
    uploadDate: number;
    isProcessed: boolean;
    hasEmbeddings: boolean;
  }>;
  onDelete: (fileId: string) => void;
  onProcess: (fileId: string) => void;
  isProcessing?: Set<string>;
}

export function FileList({
  files,
  onDelete,
  onProcess,
  isProcessing = new Set(),
}: FileListProps) {
  const sortedFiles = useMemo(() => {
    return [...files].sort((a, b) => b.uploadDate - a.uploadDate);
  }, [files]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getFileIcon = (fileType: string) => {
    return <FileText className="w-5 h-5" />;
  };

  const isProcessed = (file: { isProcessed: boolean }) => {
    return file.isProcessed;
  };

  if (files.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No files uploaded yet</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead>File Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Uploaded</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedFiles.map((file) => {
            const processing = isProcessing.has(file.id);
            const processed = isProcessed(file);

            return (
              <TableRow key={file.id}>
                <TableCell>{getFileIcon(file.type)}</TableCell>
                <TableCell className="font-medium">{file.name}</TableCell>
                <TableCell className="text-sm text-gray-600">
                  {file.type.split('/')[1]?.toUpperCase() ||
                    file.type}
                </TableCell>
                <TableCell className="text-sm text-gray-600">
                  {formatFileSize(file.size)}
                </TableCell>
                <TableCell className="text-sm text-gray-600">
                  {formatDate(file.uploadDate)}
                </TableCell>
                <TableCell>
                  {processing ? (
                    <span className="text-gray-600 text-sm">Processing...</span>
                  ) : processed ? (
                    <span className="text-green-600 text-sm">✓ Processed</span>
                  ) : (
                    <span className="text-gray-400 text-sm">Not processed</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {!processed && !processing && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onProcess(file.id)}
                      >
                        Process
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDelete(file.id)}
                      disabled={processing}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

