// frontend/src/pages/DataIngestion.tsx
import { useState } from 'react';
import { CloudUpload, FileText, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';

export default function DataIngestion() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setResult(null);
      setError(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Data Ingestion Hub</h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Upload your raw loan tape CSV. Our engine will instantly ingest the data and run asynchronous validation checks in the background.
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        {!result ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <form onSubmit={handleUpload}>
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center hover:bg-slate-50 transition-colors">
                <CloudUpload className="h-12 w-12 text-brand-500 mx-auto mb-4" />
                <label className="block mb-2 text-sm font-medium text-slate-900">
                  Select Loan Tape (.csv)
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer mb-6"
                  required
                />
              </div>

              {error && (
                <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={!file || uploading}
                className="w-full mt-6 py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold flex items-center justify-center transition-colors disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {uploading ? (
                  <><Loader2 className="animate-spin h-5 w-5 mr-3" /> Processing...</>
                ) : (
                  <><FileText className="h-5 w-5 mr-3" /> Process Tape</>
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-brand-200 p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-green-500"></div>
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Ingestion Complete</h2>
            <p className="text-slate-600 mb-6">
              Successfully ingested your records. The validation engine is currently processing the rules in the background.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
              <button 
                onClick={() => { setFile(null); setResult(null); }}
                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors cursor-pointer"
              >
                Upload Another Tape
              </button>
              {/* Changed from <Link> to a standard <a> tag to prevent Router crashes */}
              <a 
                href="/review"
                className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium flex items-center justify-center transition-colors cursor-pointer"
              >
                Go to Review Queue <ArrowRight className="h-4 w-4 ml-2" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}