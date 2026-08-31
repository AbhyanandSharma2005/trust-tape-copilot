import { useState } from 'react';
import { CloudUpload, FileText, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';

export default function Dashboard() {
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
      // THE FIX: Explicitly pointing to the backend port 3000
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
          Upload your raw loan tape CSV for automated validation and parsing.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left Panel: The Uploader */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col justify-center">
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

            {/* THE FIX: Cleaned up the className syntax string */}
            <button
              type="submit"
              disabled={!file || uploading}
              className="w-full mt-6 py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold flex items-center justify-center transition-colors disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            >
              {uploading ? (
                <><Loader2 className="animate-spin h-5 w-5 mr-3" /> Processing Tape...</>
              ) : (
                <><FileText className="h-5 w-5 mr-3" /> Upload & Process</>
              )}
            </button>
          </form>
        </div>

        {/* Right Panel: The Results Display */}
        <div className="bg-slate-50 border border-slate-200 border-dashed rounded-2xl p-8 flex flex-col justify-center items-center text-center">
          {!result ? (
            <>
              <FileText className="h-16 w-16 text-slate-300 mb-4" />
              <p className="text-slate-500">Upload a file to see validation statistics.</p>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Ingestion Complete</h2>
              <p className="text-slate-600 mb-6">Data parsed successfully. The rules engine is analyzing records in the background.</p>

              <div className="grid grid-cols-2 gap-4 w-full mb-8">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-sm font-bold text-slate-500 uppercase">Records Ingested</p>
                  <p className="text-3xl font-black text-slate-900">{result?.ingestion?.totalRows || 0}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-sm font-bold text-slate-500 uppercase">Failed Rows</p>
                  <p className="text-3xl font-black text-red-600">{result?.ingestion?.failCount || 0}</p>
                </div>
              </div>

              <a href="/review" className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium flex items-center justify-center transition-colors">
                Open Review Queue <ArrowRight className="h-5 w-5 ml-2" />
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}