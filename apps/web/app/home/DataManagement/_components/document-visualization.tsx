'use client';

import { Card } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { FileText, Globe, Lock, Calendar, Database } from 'lucide-react';
import { useMemo } from 'react';

interface DocumentVisualizationProps {
  files: Array<{
    id: string;
    name: string;
    type: string;
    size: number;
    uploadDate: number;
    isProcessed: boolean;
    hasEmbeddings: boolean;
    isPublic: boolean;
  }>;
}

export function DocumentVisualization({ files }: DocumentVisualizationProps) {
  const stats = useMemo(() => {
    const totalFiles = files.length;
    const processedFiles = files.filter(f => f.isProcessed).length;
    const publicFiles = files.filter(f => f.isPublic).length;
    const privateFiles = totalFiles - publicFiles;
    const totalSize = files.reduce((acc, f) => acc + f.size, 0);
    const withEmbeddings = files.filter(f => f.hasEmbeddings).length;

    return {
      totalFiles,
      processedFiles,
      publicFiles,
      privateFiles,
      totalSize,
      withEmbeddings,
    };
  }, [files]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getFileTypeColor = (type: string) => {
    if (type.includes('pdf')) return 'bg-red-100 text-red-700 border-red-300';
    if (type.includes('text')) return 'bg-blue-100 text-blue-700 border-blue-300';
    if (type.includes('word') || type.includes('docx')) return 'bg-indigo-100 text-indigo-700 border-indigo-300';
    if (type.includes('csv') || type.includes('excel')) return 'bg-green-100 text-green-700 border-green-300';
    return 'bg-gray-100 text-gray-700 border-gray-300';
  };

  const recentFiles = useMemo(() => {
    return [...files]
      .sort((a, b) => b.uploadDate - a.uploadDate)
      .slice(0, 6);
  }, [files]);

  if (files.length === 0) {
    return (
      <div className="text-center py-16">
        <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Documents Yet</h3>
        <p className="text-gray-500">Upload your first document to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-2 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Documents</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalFiles}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {formatFileSize(stats.totalSize)} total
          </p>
        </Card>

        <Card className="p-4 border-2 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Processed</p>
              <p className="text-3xl font-bold text-green-600">{stats.processedFiles}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Database className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {stats.withEmbeddings} with embeddings
          </p>
        </Card>

        <Card className="p-4 border-2 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Public Files</p>
              <p className="text-3xl font-bold text-purple-600">{stats.publicFiles}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Globe className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Accessible to everyone
          </p>
        </Card>

        <Card className="p-4 border-2 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Private Files</p>
              <p className="text-3xl font-bold text-orange-600">{stats.privateFiles}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <Lock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Only visible to you
          </p>
        </Card>
      </div>

      {/* Recent Documents Grid */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Recent Documents
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recentFiles.map((file) => (
            <Card 
              key={file.id} 
              className="p-4 hover:shadow-lg transition-all hover:scale-105 border-2"
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${getFileTypeColor(file.type)}`}>
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate mb-2" title={file.name}>
                    {file.name}
                  </h4>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {file.isPublic ? (
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
                        <Globe className="w-3 h-3 mr-1" />
                        Public
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700 border-gray-300">
                        <Lock className="w-3 h-3 mr-1" />
                        Private
                      </Badge>
                    )}
                    {file.isProcessed && (
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-300">
                        ✓ Processed
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>{formatFileSize(file.size)}</p>
                    <p>{new Date(file.uploadDate).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Document Type Distribution */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Document Types</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(
            files.reduce((acc, file) => {
              const ext = file.type.split('/')[1]?.toUpperCase() || 'OTHER';
              acc[ext] = (acc[ext] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)
          ).map(([type, count]) => (
            <Card key={type} className="p-3 text-center border-2">
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className="text-xs text-gray-600 uppercase">{type}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
