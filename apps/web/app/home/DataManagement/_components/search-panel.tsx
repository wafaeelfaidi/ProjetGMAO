'use client';

import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Search } from 'lucide-react';
import { useState } from 'react';

interface SearchPanelProps {
  files: Array<{ id: string; name: string }>;
  onSearch: (query: string, fileId?: string, topK?: number) => Promise<void>;
  results: Array<{
    fileId: string;
    chunkIndex: number;
    text: string;
    similarity: number;
  }>;
  isSearching: boolean;
}

export function SearchPanel({
  files,
  onSearch,
  results,
  isSearching,
}: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<string>('all');
  const [topK, setTopK] = useState(5);

  const handleSearch = async () => {
    if (query.trim()) {
      await onSearch(
        query,
        selectedFile === 'all' ? undefined : selectedFile,
        topK,
      );
    }
  };

  const getFileName = (fileId: string) => {
    return files.find((f) => f.id === fileId)?.name || 'Unknown';
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="flex-1">
          <Label htmlFor="search-query">Search Query</Label>
          <Input
            id="search-query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter search query..."
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>

        <div className="w-48">
          <Label htmlFor="file-filter">File</Label>
          <Select value={selectedFile} onValueChange={setSelectedFile}>
            <SelectTrigger id="file-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Files</SelectItem>
              {files
                .filter((f) => f.name)
                .map((file) => (
                  <SelectItem key={file.id} value={file.id}>
                    {file.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-24">
          <Label htmlFor="top-k">Results</Label>
          <Input
            id="top-k"
            type="number"
            min={1}
            max={20}
            value={topK}
            onChange={(e) => setTopK(Number(e.target.value))}
          />
        </div>

        <div className="flex items-end">
          <Button onClick={handleSearch} disabled={isSearching || !query.trim()}>
            <Search className="w-4 h-4 mr-2" />
            Search
          </Button>
        </div>
      </div>

      {isSearching && (
        <div className="text-center py-8 text-gray-500">Searching...</div>
      )}

      {!isSearching && results.length > 0 && (
        <div className="space-y-3 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-lg">
              Search Results ({results.length})
            </h3>
            <span className="text-sm text-gray-500">
              Found in {new Set(results.map(r => r.fileId)).size} document(s)
            </span>
          </div>
          {results.map((result, idx) => (
            <div
              key={`${result.fileId}-${result.chunkIndex}`}
              className="border rounded-lg p-4 hover:bg-gray-100 hover:border-gray-400 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    #{idx + 1}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {getFileName(result.fileId)}
                    </span>
                    <span className="text-xs text-gray-500">
                      Chunk {result.chunkIndex + 1}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-sm font-semibold text-green-600">
                    {(result.similarity * 100).toFixed(1)}% match
                  </span>
                  <span className="text-xs text-gray-500">
                    Relevance score
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed line-clamp-4">
                {result.text}
              </p>
            </div>
          ))}
        </div>
      )}

      {!isSearching && results.length === 0 && query && (
        <div className="text-center py-8 text-gray-500">
          No results found. Try a different query.
        </div>
      )}
    </div>
  );
}

