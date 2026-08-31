import { useState, useEffect } from 'react';
import { FileText, Download, ShieldAlert, BarChart3, Activity, ListOrdered, ShieldCheck } from 'lucide-react';

export default function ExecutiveReport() {
  const [reportData, setReportData] = useState<any>(null);
  const [warehouseCount, setWarehouseCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    // Fetch your existing report data, plus the new warehouse stats
    fetch('/api/report/summary')
      .then(res => res.json())
      .then(data => setReportData(data))
      .catch(err => console.error(err));
    
    fetch('/api/etl/stats')
      .then(res => res.json())
      .then(data => setWarehouseCount(data.totalRecords))
      .catch(err => console.error(err));
  }, []);

  const handleRunETL = async () => {
    setSyncing(true);
    try {
      await fetch('/api/etl/sync', { method: 'POST' });
      // Refresh the stats after sync
      const statsRes = await fetch('/api/etl/stats');
      const statsData = await statsRes.json();
      setWarehouseCount(statsData.totalRecords);
      
      // Refresh the main report to show the operational database is now empty
      const reportRes = await fetch('/api/report/summary');
      const reportData = await reportRes.json();
      setReportData(reportData);
    } catch (err) {
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  const handleDownloadPDF = () => {
    window.print(); 
  };

  if (!reportData) return <div className="p-10 text-center text-slate-500">Compiling executive metrics...</div>;

  const cleanPercentage = parseFloat(reportData.metrics.complianceRate);
  const errorPercentage = 100 - cleanPercentage;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      
      <div className="flex justify-between items-center mb-8 no-print bg-slate-900 p-4 rounded-xl text-white shadow-lg">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-brand-400" />
          <span className="font-semibold">Executive Reporting Engine</span>
        </div>
        <button 
          onClick={handleDownloadPDF}
          className="bg-brand-600 hover:bg-brand-500 px-4 py-2 rounded-lg font-medium flex items-center transition-colors cursor-pointer"
        >
          <Download className="h-4 w-4 mr-2" /> Download PDF Report
        </button>
      </div>

      <div className="bg-white p-12 rounded-lg shadow-sm border border-slate-200 print-document min-h-[1056px]">
        
        {/* Header */}
        <div className="border-b-4 border-slate-900 pb-6 mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">Audit Summary</h1>
            <p className="text-xl text-slate-500 mt-2 font-medium">TrustTape Copilot Validation Engine</p>
          </div>
          <div className="text-right">
            <ShieldAlert className="h-10 w-10 text-slate-900 ml-auto mb-2" />
            <p className="text-sm font-bold text-slate-400 uppercase">Generated On</p>
            <p className="text-sm font-medium text-slate-800">{reportData.reportDate}</p>
          </div>
        </div>

        {/* Health Overview & Visual Bar */}
        <div className="mb-10">
          <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2 flex items-center gap-2">
            <Activity className="h-5 w-5 text-brand-600" /> Portfolio Health Overview
          </h2>
          <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-xl border border-slate-100 mb-6">
            <div className="flex-1">
              <p className="text-sm text-slate-500 uppercase font-bold tracking-wider mb-1">System Status</p>
              <p className={`text-2xl font-black ${reportData.systemStatus === 'SECURE & COMPLIANT' ? 'text-green-600' : 'text-red-600'}`}>
                {reportData.systemStatus}
              </p>
            </div>
            <div className="w-px h-16 bg-slate-200"></div>
            <div className="flex-1 text-center">
              <p className="text-sm text-slate-500 uppercase font-bold tracking-wider mb-1">Compliance Rate</p>
              <p className="text-4xl font-black text-slate-900">{reportData.metrics.complianceRate}%</p>
            </div>
          </div>

          {/* Visual Progress Bar */}
          <div className="w-full bg-slate-100 h-6 rounded-full overflow-hidden flex border border-slate-200">
            <div style={{ width: `${cleanPercentage}%` }} className="bg-green-500 h-full flex items-center px-3">
              {cleanPercentage > 10 && <span className="text-[10px] font-bold text-white">CLEAN</span>}
            </div>
            <div style={{ width: `${errorPercentage}%` }} className="bg-red-500 h-full flex items-center justify-end px-3">
              {errorPercentage > 10 && <span className="text-[10px] font-bold text-white">FLAGGED</span>}
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="mb-10">
          <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-brand-600" /> Validation Metrics
          </h2>
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 border border-slate-200 rounded-lg text-center">
              <p className="text-xs text-slate-500 uppercase font-bold">Total Scanned</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{reportData.metrics.totalRecords.toLocaleString()}</p>
            </div>
            <div className="p-4 border border-red-200 bg-red-50 rounded-lg text-center">
              <p className="text-xs text-red-600 uppercase font-bold">Open Risks</p>
              <p className="text-2xl font-black text-red-700 mt-1">{reportData.metrics.openExceptions.toLocaleString()}</p>
            </div>
            <div className="p-4 border border-green-200 bg-green-50 rounded-lg text-center">
              <p className="text-xs text-green-700 uppercase font-bold">Resolved</p>
              <p className="text-2xl font-black text-green-800 mt-1">{reportData.metrics.resolvedExceptions.toLocaleString()}</p>
            </div>
            <div className="p-4 border border-brand-200 bg-brand-50 rounded-lg text-center">
              <p className="text-xs text-brand-600 uppercase font-bold">AI Fixes</p>
              <p className="text-2xl font-black text-brand-700 mt-1">{reportData.metrics.aiCorrections.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* NEW: Cloud Data Warehouse ETL Panel */}
        <div className="mb-10 bg-slate-900 rounded-xl p-6 text-white shadow-lg border border-slate-800 no-print">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
                ☁️ Cloud Analytics Warehouse
              </h2>
              <p className="text-slate-400 text-sm">
                Migrate fully compliant records out of the operational database into permanent cold storage.
              </p>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Archived Records</p>
                <p className="text-3xl font-black text-brand-400">{warehouseCount.toLocaleString()}</p>
              </div>
              <div className="w-px h-12 bg-slate-700"></div>
              <button 
                onClick={handleRunETL}
                disabled={syncing || reportData.metrics.totalRecords === 0 || reportData.metrics.openExceptions > 0}
                className="px-6 py-3 bg-brand-600 hover:bg-brand-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-lg transition-colors cursor-pointer"
              >
                {syncing ? 'Running ETL Sync...' : 'Run Pipeline Sync'}
              </button>
            </div>
          </div>
          {reportData.metrics.openExceptions > 0 && (
            <p className="text-xs text-red-400 mt-4 font-medium flex items-center gap-1">
              * Pipeline locked. All exceptions must be resolved before initiating a warehouse sync.
            </p>
          )}
        </div>

        {/* Top Violations Table & Security Audit */}
        <div className="grid grid-cols-2 gap-8 mb-10">
          <div>
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2 flex items-center gap-2">
              <ListOrdered className="h-5 w-5 text-brand-600" /> Top Rule Violations
            </h2>
            {reportData.metrics.topViolations?.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="py-2 text-xs text-slate-500 uppercase">Rule Name</th>
                    <th className="py-2 text-xs text-slate-500 uppercase text-right">Incidents</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.metrics.topViolations.map((v: any, i: number) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0">
                      <td className="py-3 text-sm font-medium text-slate-800">{v.name}</td>
                      <td className="py-3 text-sm font-black text-slate-900 text-right">{v.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-slate-500 italic">No active violations detected.</p>
            )}
          </div>
          
          <div>
             <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-brand-600" /> Active Security Systems
            </h2>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="mt-0.5 bg-green-100 p-1 rounded">
                  <ShieldCheck className="h-4 w-4 text-green-700" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Cryptographic Hashing</p>
                  <p className="text-xs text-slate-500">SHA-256 integrity locks active on all parsed records.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-0.5 bg-green-100 p-1 rounded">
                  <ShieldCheck className="h-4 w-4 text-green-700" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Graph Theory Traversal</p>
                  <p className="text-xs text-slate-500">DFS algorithms continuously scanning for fraud rings.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-6 border-t-2 border-slate-900 text-center text-sm text-slate-500 font-medium">
          <p>This document is highly confidential and contains proprietary system architecture data.</p>
          <p className="mt-1">Generated automatically by TrustTape Copilot AI Validation Engine.</p>
        </div>

      </div>
    </div>
  );
}