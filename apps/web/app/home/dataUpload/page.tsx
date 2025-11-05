"use client";
import { useState, useEffect } from "react";
import { Upload, FileText, CheckCircle, XCircle, Loader, Trash2, Search, Download, RefreshCw, Database, Zap, Clock } from "lucide-react";
import { useSupabaseSession } from "~/lib/supabase/use-session";
import { uploadDocuments, processStoredDocuments } from "~/lib/document-processing/processor";
import type { UploadProgress, ProcessingProgress } from "~/lib/document-processing/processor";
import { hasCohereApiKey, restoreApiKey } from "~/lib/cohere/client";
import { ApiKeyManager } from "~/components/api-key-manager";
import {
  getUserDocuments,
  deleteDocument,
  searchDocuments,
  getStorageStats,
  exportAllDocuments,
  formatFileSize,
  formatDate,
} from "~/lib/document-management/utils";
import type { DocumentSummary } from "~/lib/document-management/utils";
import { ClientStorage } from "~/lib/client-storage/indexed-db";

interface UploadStatus {
  fileName: string;
  status: "pending" | "uploading" | "uploaded" | "error";
  progress: number;
  stage?: string;
  error?: string;
  documentId?: string;
}

export default function DataUploadPage() {
  // Upload state
  const [files, setFiles] = useState<File[]>([]);
  const [uploadStatuses, setUploadStatuses] = useState<UploadStatus[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(hasCohereApiKey());
  const [showSettings, setShowSettings] = useState(false);
  
  // Document management state
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    totalDocuments: number;
    totalChunks: number;
    totalSize: string;
  } | null>(null);
  
  // Processing state
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Active tab
  const [activeTab, setActiveTab] = useState<"upload" | "documents">("upload");
  
  const { session, loading: sessionLoading } = useSupabaseSession();

  // Initialize: Restore API key and load documents
  useEffect(() => {
    const init = async () => {
      if (!hasCohereApiKey()) {
        const restored = await restoreApiKey();
        if (restored) {
          setHasApiKey(true);
        }
      }
      
      if (!sessionLoading && session?.user?.id) {
        loadDocuments();
        loadStats();
      }
    };
    init();
  }, [session, sessionLoading]);

  // Document management functions
  const loadDocuments = async () => {
    if (!session?.user?.id) return;
    
    setLoading(true);
    try {
      const docs = await getUserDocuments(session.user.id);
      setDocuments(docs);
    } catch (error) {
      console.error("Failed to load documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!session?.user?.id) return;
    
    try {
      const storageStats = await getStorageStats(session.user.id);
      setStats({
        totalDocuments: storageStats.totalDocuments,
        totalChunks: storageStats.totalChunks,
        totalSize: formatFileSize(storageStats.totalSize),
      });
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const handleDeleteDocument = async (id: string, fileName: string) => {
    if (!confirm(`Delete "${fileName}" and all its embeddings?`)) return;

    try {
      await deleteDocument(id);
      await loadDocuments();
      await loadStats();
      alert("Document deleted successfully!");
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete document");
    }
  };

  const handleSearch = async () => {
    if (!session?.user?.id) return;
    
    if (!searchQuery.trim()) {
      loadDocuments();
      return;
    }

    try {
      const results = await searchDocuments(session.user.id, searchQuery);
      setDocuments(results);
    } catch (error) {
      console.error("Search failed:", error);
    }
  };

  const handleExport = async () => {
    if (!session?.user?.id) return;
    
    try {
      const exported = await exportAllDocuments(session.user.id);
      const blob = new Blob([exported], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `documents-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      alert("Documents exported successfully!");
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export documents");
    }
  };

  // Upload functions
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selectedFiles]);
      
      const newStatuses = selectedFiles.map(file => ({
        fileName: file.name,
        status: "pending" as const,
        progress: 0,
      }));
      setUploadStatuses(prev => [...prev, ...newStatuses]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      setFiles(prev => [...prev, ...droppedFiles]);
      
      const newStatuses = droppedFiles.map(file => ({
        fileName: file.name,
        status: "pending" as const,
        progress: 0,
      }));
      setUploadStatuses(prev => [...prev, ...newStatuses]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setUploadStatuses(prev => prev.filter((_, i) => i !== index));
  };


  const handleUpload = async () => {
    if (!session?.user?.id) {
      alert("Please log in to upload documents");
      return;
    }

    if (files.length === 0) {
      alert("Please select files to upload");
      return;
    }

    setIsUploading(true);

    try {
      await uploadDocuments(
        files,
        session.user.id,
        (fileIndex: number, progress: UploadProgress) => {
          setUploadStatuses(prev => {
            const updated = [...prev];
            if (updated[fileIndex]) {
              updated[fileIndex] = {
                ...updated[fileIndex],
                status: progress.stage === "complete" ? "uploaded" : "uploading",
                progress: progress.progress,
                stage: progress.message,
              };
            }
            return updated;
          });
        }
      );

      alert("Documents uploaded successfully! Go to 'My Documents' tab to process them.");
      
      // Reload documents and stats after successful upload
      await loadDocuments();
      await loadStats();
      
      // Clear files and switch to documents tab
      setFiles([]);
      setUploadStatuses([]);
      setActiveTab("documents");
    } catch (error) {
      console.error("Upload error:", error);
      alert(error instanceof Error ? error.message : "Failed to upload documents");
    } finally {
      setIsUploading(false);
    }
  };

  const clearCompleted = () => {
    const uploadedIndices = uploadStatuses
      .map((status, index) => (status.status === "uploaded" ? index : -1))
      .filter(i => i !== -1);
    
    setFiles(prev => prev.filter((_, i) => !uploadedIndices.includes(i)));
    setUploadStatuses(prev => prev.filter((_, i) => !uploadedIndices.includes(i)));
  };

  const handleProcessSelected = async () => {
    if (!session?.user?.id) {
      alert("Please log in to process documents");
      return;
    }

    if (!hasApiKey) {
      setShowSettings(true);
      return;
    }

    if (selectedDocs.size === 0) {
      alert("Please select documents to process");
      return;
    }

    setIsProcessing(true);
    const selectedDocIds = Array.from(selectedDocs);

    try {
      await processStoredDocuments(
        selectedDocIds,
        session.user.id,
        (docIndex: number, progress: ProcessingProgress) => {
          console.log(`Processing document ${docIndex + 1}/${selectedDocIds.length}: ${progress.message} (${progress.progress}%)`);
        }
      );

      alert(`Successfully processed ${selectedDocIds.length} document(s)!`);
      
      // Clear selection and reload documents
      setSelectedDocs(new Set());
      await loadDocuments();
      await loadStats();
    } catch (error) {
      console.error("Processing error:", error);
      alert(error instanceof Error ? error.message : "Failed to process documents");
    } finally {
      setIsProcessing(false);
    }
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-center justify-center">
              <Loader className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-3 text-slate-600">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center">
            <Database className="w-8 h-8 mr-3 text-blue-600" />
            Document Management
          </h1>
          <p className="text-slate-600">
            Upload and manage your documents • All data stays in your browser
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 bg-white rounded-xl shadow p-1 flex">
          <button
            onClick={() => setActiveTab("upload")}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center ${
              activeTab === "upload"
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Upload className="w-5 h-5 mr-2" />
            Upload Documents
          </button>
          <button
            onClick={() => setActiveTab("documents")}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center ${
              activeTab === "documents"
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <FileText className="w-5 h-5 mr-2" />
            My Documents {stats && `(${stats.totalDocuments})`}
          </button>
        </div>

        {/* Upload Tab */}
        {activeTab === "upload" && (
          <>
            {/* Settings Panel */}
            {showSettings && (
              <div className="mb-6">
                <ApiKeyManager onKeySet={() => {
                  setHasApiKey(true);
                  setShowSettings(false);
                }} />
              </div>
            )}

            {/* Upload Area */}
            <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center hover:border-blue-400 transition-colors cursor-pointer"
              >
                <Upload className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                <p className="text-lg font-medium text-slate-700 mb-2">
                  Drop files here or click to browse
                </p>
                <p className="text-sm text-slate-500 mb-4">
                  Supported: TXT, MD, JSON, CSV, PDF, DOCX
                </p>
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-input"
                  accept=".txt,.md,.json,.csv,.pdf,.doc,.docx"
                />
                <label
                  htmlFor="file-input"
                  className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors"
                >
                  Select Files
                </label>
              </div>
            </div>

            {/* File List */}
            {uploadStatuses.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-slate-900">
                    Files ({uploadStatuses.length})
                  </h2>
                  <div className="space-x-2">
                    {uploadStatuses.some(s => s.status === "uploaded") && (
                      <button
                        onClick={clearCompleted}
                        className="px-4 py-2 text-sm bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                      >
                        Clear Uploaded
                      </button>
                    )}
                    <button
                      onClick={handleUpload}
                      disabled={isUploading}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {isUploading ? "Uploading..." : "Upload All"}
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {uploadStatuses.map((status, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3 flex-1">
                        <FileText className="w-5 h-5 text-slate-400" />
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{status.fileName}</p>
                          {status.stage && (
                            <p className="text-sm text-slate-600">{status.stage}</p>
                          )}
                          {status.error && (
                            <p className="text-sm text-red-600">{status.error}</p>
                          )}
                          {status.status === "uploading" && (
                            <div className="mt-2 w-full bg-slate-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${status.progress}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {status.status === "pending" && (
                          <button
                            onClick={() => removeFile(index)}
                            disabled={isUploading}
                            className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        )}
                        {status.status === "uploading" && (
                          <Loader className="w-5 h-5 animate-spin text-blue-600" />
                        )}
                        {status.status === "uploaded" && (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        )}
                        {status.status === "error" && (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Info */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-sm text-blue-800">
                <strong>ℹ️ How it works:</strong> Documents are processed entirely in your browser. Text is extracted, chunked, and embedded using Cohere's API. All data is stored locally in IndexedDB.
              </p>
            </div>
          </>
        )}

        {/* Documents Tab */}
        {activeTab === "documents" && (
          <>
            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl shadow p-6">
                  <p className="text-sm text-slate-600 mb-1">Total Documents</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.totalDocuments}</p>
                </div>
                <div className="bg-white rounded-xl shadow p-6">
                  <p className="text-sm text-slate-600 mb-1">Total Chunks</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.totalChunks}</p>
                </div>
                <div className="bg-white rounded-xl shadow p-6">
                  <p className="text-sm text-slate-600 mb-1">Storage Used</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.totalSize}</p>
                </div>
              </div>
            )}

            {/* Search & Actions */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search documents by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Search
                </button>
                {selectedDocs.size > 0 && (
                  <button
                    onClick={handleProcessSelected}
                    disabled={isProcessing}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors flex items-center"
                  >
                    <Zap className="w-5 h-5 mr-2" />
                    {isProcessing ? "Processing..." : `Process (${selectedDocs.size})`}
                  </button>
                )}
                <button
                  onClick={() => {
                    loadDocuments();
                    loadStats();
                  }}
                  className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center justify-center"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
                <button
                  onClick={handleExport}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Export
                </button>
              </div>
            </div>

            {/* Documents List */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              {loading ? (
                <div className="p-12 text-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-slate-600">Loading documents...</p>
                </div>
              ) : documents.length === 0 ? (
                <div className="p-12 text-center">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p className="text-xl font-medium text-slate-700 mb-2">
                    {searchQuery ? "No documents found" : "No documents uploaded"}
                  </p>
                  <p className="text-slate-500 mb-4">
                    {searchQuery
                      ? "Try a different search term"
                      : "Upload documents to get started"}
                  </p>
                  {!searchQuery && (
                    <button
                      onClick={() => setActiveTab("upload")}
                      className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Upload Documents
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={documents.length > 0 && selectedDocs.size === documents.filter(d => !d.processed).length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedDocs(new Set(documents.filter(d => !d.processed).map(d => d.id)));
                              } else {
                                setSelectedDocs(new Set());
                              }
                            }}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                          Document
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                          Size
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                          Chunks
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                          Uploaded
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {documents.map((doc) => (
                        <tr key={doc.id} className="hover:bg-slate-50">
                          <td className="px-4 py-4">
                            <input
                              type="checkbox"
                              checked={selectedDocs.has(doc.id)}
                              onChange={(e) => {
                                const newSelected = new Set(selectedDocs);
                                if (e.target.checked) {
                                  newSelected.add(doc.id);
                                } else {
                                  newSelected.delete(doc.id);
                                }
                                setSelectedDocs(newSelected);
                              }}
                              disabled={doc.processed}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <FileText className="w-5 h-5 text-slate-400 mr-3 flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="font-medium text-slate-900 truncate">{doc.fileName}</p>
                                <p className="text-xs text-slate-500 truncate" title={doc.id}>
                                  ID: {doc.id.slice(0, 8)}...
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {doc.processed ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Processed
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                <Clock className="w-3 h-3 mr-1" />
                                Unprocessed
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                            {formatFileSize(doc.size)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                            {doc.chunkCount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                            {formatDate(doc.uploadedAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => handleDeleteDocument(doc.id, doc.fileName)}
                              className="text-red-600 hover:text-red-800 transition-colors p-2 rounded hover:bg-red-50"
                              title="Delete document"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Info Footer */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-sm text-blue-800">
                <strong>ℹ️ Local Storage:</strong> All documents and embeddings are stored in your browser's IndexedDB. Deleting browser data will remove all documents. Use the Export button to create backups.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}