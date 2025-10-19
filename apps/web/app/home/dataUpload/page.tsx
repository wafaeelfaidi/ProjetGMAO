"use client";
import { useState } from "react";
import { useSupabase } from '@kit/supabase/hooks/use-supabase';

export default function DataUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const supabase = useSupabase();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return setStatus("⚠️ Select a file first.");

    setStatus("⏳ Uploading...");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setStatus("⚠️ Authentication error. Please sign in again.");
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Upload failed");

      setStatus(`✅ Uploaded: ${data.file.name}`);
    } catch (err: any) {
      setStatus(`❌ Error: ${err.message}`);
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Upload technical document</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="file"
          accept=".pdf,.docx,.xlsx,.csv,.txt"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-gray-700 border border-gray-300 rounded-lg cursor-pointer focus:outline-none"
        />
        <button
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          type="submit"
          disabled={!file}
        >
          Upload
        </button>
      </form>
      {status && (
        <p className={`mt-4 text-sm ${
          status.includes('❌') ? 'text-red-600' : 
          status.includes('⚠️') ? 'text-yellow-600' : 
          status.includes('✅') ? 'text-green-600' : ''
        }`}>
          {status}
        </p>
      )}
    </div>
  );
}
