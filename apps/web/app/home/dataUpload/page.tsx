"use client";
import { useState } from "react";
import { Upload, File, CheckCircle, AlertCircle, X, FileText, FileSpreadsheet } from "lucide-react";
import { useSupabase } from '@kit/supabase/hooks/use-supabase';

export default function DataUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const supabase = useSupabase();

  const acceptedTypes = {
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
    "text/csv": ".csv",
    "text/plain": ".txt"
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf' || ext === 'docx' || ext === 'txt') return FileText;
    if (ext === 'xlsx' || ext === 'csv') return FileSpreadsheet;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && Object.keys(acceptedTypes).includes(droppedFile.type)) {
      setFile(droppedFile);
      setStatus("idle");
      setMessage("");
    } else {
      setStatus("error");
      setMessage("Type de fichier non accepté");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setStatus("idle");
      setMessage("");
    }
  };

  const removeFile = () => {
    setFile(null);
    setStatus("idle");
    setMessage("");
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setStatus("error");
      setMessage("Veuillez sélectionner un fichier");
      return;
    }

    setStatus("uploading");
    setMessage("Téléversement en cours...");
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setStatus("error");
        setMessage("Erreur d'authentification. Veuillez vous reconnecter.");
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        setStatus("error");
        setMessage("Session expirée. Veuillez vous reconnecter.");
        return;
      }
      
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data?.error || `Erreur ${res.status}: ${res.statusText}`);
      }

      setStatus("success");
      setMessage(`Document "${data.file?.name || file.name}" téléversé avec succès`);
      
      setTimeout(() => {
        setFile(null);
        setStatus("idle");
        setMessage("");
      }, 3000);
      
    } catch (err: any) {
      console.error("Upload error:", err);
      setStatus("error");
      setMessage(err.message || "Une erreur est survenue lors du téléversement");
    }
  }

  const FileIcon = file ? getFileIcon(file.name) : File;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Gestion des Documents
          </h1>
          <p className="text-slate-600">
            Téléversez vos documents techniques pour la GMAO
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-8">
            <div className="space-y-6">
              {/* Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all ${
                  isDragging
                    ? "border-blue-500 bg-blue-50"
                    : file
                    ? "border-green-300 bg-green-50"
                    : "border-slate-300 bg-slate-50 hover:border-slate-400"
                }`}
              >
                {!file ? (
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <div className="p-4 bg-blue-100 rounded-full">
                        <Upload className="w-8 h-8 text-blue-600" />
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <span className="text-lg font-semibold text-blue-600 hover:text-blue-700">
                          Sélectionner un fichier
                        </span>
                        <span className="text-slate-600"> ou glissez-déposez</span>
                      </label>
                      <input
                        id="file-upload"
                        type="file"
                        accept=".pdf,.docx,.xlsx,.csv,.txt"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </div>
                    
                    <p className="text-sm text-slate-500">
                      PDF, DOCX, XLSX, CSV ou TXT jusqu'à 10MB
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <FileIcon className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-slate-900 truncate max-w-md">
                          {file.name}
                        </p>
                        <p className="text-sm text-slate-500">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeFile}
                      className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                      <X className="w-5 h-5 text-slate-500" />
                    </button>
                  </div>
                )}
              </div>

              {/* Status Message */}
              {message && (
                <div
                  className={`flex items-center space-x-3 p-4 rounded-lg ${
                    status === "success"
                      ? "bg-green-50 text-green-800"
                      : status === "error"
                      ? "bg-red-50 text-red-800"
                      : "bg-blue-50 text-blue-800"
                  }`}
                >
                  {status === "success" && (
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  )}
                  {status === "error" && (
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  )}
                  {status === "uploading" && (
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  )}
                  <p className="font-medium">{message}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!file || status === "uploading"}
                className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:shadow-none flex items-center justify-center space-x-2"
              >
                {status === "uploading" ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Téléversement...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    <span>Téléverser le document</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Info Footer */}
          <div className="bg-slate-50 px-8 py-6 border-t border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-3">
              Types de documents acceptés
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { ext: "PDF", icon: FileText, color: "red" },
                { ext: "DOCX", icon: FileText, color: "blue" },
                { ext: "XLSX", icon: FileSpreadsheet, color: "green" },
                { ext: "CSV", icon: FileSpreadsheet, color: "emerald" },
                { ext: "TXT", icon: FileText, color: "slate" }
              ].map((type) => (
                <div
                  key={type.ext}
                  className="flex items-center space-x-2 text-sm text-slate-600"
                >
                  <type.icon className={`w-4 h-4 text-${type.color}-500`} />
                  <span>{type.ext}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-sm text-blue-800">
            <strong>💡 Conseil :</strong> Assurez-vous que vos documents sont bien nommés et organisés pour faciliter leur recherche ultérieure.
          </p>
        </div>
      </div>
    </div>
  );
}