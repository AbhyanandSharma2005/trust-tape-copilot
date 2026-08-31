import { useState, useEffect } from 'react';
import { ShieldAlert, Bot, ArrowRight, CheckCircle2, FileJson, Loader2, UserCheck, Lock } from 'lucide-react';

export default function ReviewQueue() {
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [selectedEx, setSelectedEx] = useState<any>(null);
  const [aiRec, setAiRec] = useState<any>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [userRole, setUserRole] = useState<'operator' | 'manager'>('operator');

  const fetchExceptions = async () => {
    try {
      const res = await fetch('/api/exceptions/queue');
      const data = await res.json();
      if (Array.isArray(data)) {
        setExceptions(data);
        if (selectedEx) {
          const updated = data.find((e: any) => e.id === selectedEx.id);
          setSelectedEx(updated || (data.length > 0 ? data[0] : null));
        } else if (data.length > 0) {
          setSelectedEx(data[0]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchExceptions();
  }, []);

  const handleAskAI = async () => {
    if (!selectedEx) return;
    setLoadingAi(true);
    try {
      const res = await fetch(`/api/ai/recommend/${selectedEx.id}`, { method: 'POST' });
      const data = await res.json();
      setAiRec(JSON.parse(data.recommendation.response));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAi(false);
    }
  };

  const handleAction = async (actionType: string) => {
    if (!selectedEx) return;
    setResolving(true);
    try {
      const correctedFields = aiRec?.suggestedCorrection || { current_balance: 0 };

      await fetch(`/api/exceptions/${selectedEx.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          comment: actionType === 'authorize_fix' 
            ? 'Manager authorized correction' 
            : 'Submitted for manager approval',
          correctedFields
        })
      });

      await fetchExceptions();

      if (actionType === 'authorize_fix' || actionType === 'correct') {
        setSelectedEx(null);
        setAiRec(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setResolving(false);
    }
  };

  const formatRawData = (rawData: any) => {
    if (!rawData) return "No raw data available";
    try {
      const parsed = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      return String(rawData);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[calc(100vh-4rem)] flex flex-col">
      
      {/* THE DEMO ROLE SWITCHER & BATCH ACTIONS (NEW LIGHT THEME) */}
      <div className="mb-8 flex flex-col gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Reviewer Copilot</h1>
            <p className="text-slate-500 text-sm mt-1">Maker-Checker Authorization Engine</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Simulating Role:</span>
            
            {/* Elegant Toggle Switch */}
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button 
                onClick={() => setUserRole('operator')}
                className={`px-4 py-2 rounded-md text-sm font-bold transition-all cursor-pointer ${userRole === 'operator' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Data Operator
              </button>
              <button 
                onClick={() => setUserRole('manager')}
                className={`px-4 py-2 rounded-md text-sm font-bold transition-all cursor-pointer ${userRole === 'manager' ? 'bg-white text-green-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Compliance Manager
              </button>
            </div>

            <div className="w-px h-8 bg-slate-200 mx-2"></div>
            
            <a href="/api/export" download className="px-5 py-2.5 rounded-lg text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white transition-colors cursor-pointer shadow-sm">
              Export Clean Tape
            </a>
          </div>
        </div>

        {/* High-Contrast Batch Actions Toolbar */}
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-2">
          {userRole === 'operator' ? (
            <button 
              onClick={async () => {
                await fetch('/api/exceptions/bulk-resolve', { method: 'POST' });
                fetchExceptions();
              }}
              className="px-6 py-2.5 rounded-lg text-sm font-bold bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 transition-colors cursor-pointer shadow-sm"
            >
              Run AI Batch Fix (500 Records)
            </button>
          ) : (
            <button 
              onClick={async () => {
                await fetch('/api/exceptions/bulk-authorize', { method: 'POST' });
                fetchExceptions();
              }}
              className="px-6 py-2.5 rounded-lg text-sm font-bold bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 transition-colors cursor-pointer shadow-sm"
            >
              Authorize All Pending
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        
        {/* Exception Queue */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-y-auto">
          <div className="p-4 border-b border-slate-200 bg-slate-50 sticky top-0">
            <h3 className="font-semibold text-slate-700">Exception Queue</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {exceptions.map(ex => (
              <button
                key={ex.id}
                onClick={() => { setSelectedEx(ex); setAiRec(null); }}
                className={`w-full text-left p-4 hover:bg-slate-50 transition-colors cursor-pointer ${
                  selectedEx?.id === ex.id ? 'border-l-4 border-brand-500 bg-brand-50/50' : 'border-l-4 border-transparent'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-mono text-sm font-semibold text-slate-900">{ex.normalizedRecord?.loanId || 'Unknown ID'}</span>
                  <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase tracking-wide ${
                    ex.status === 'pending_approval' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-700'
                  }`}>
                    {ex.status === 'pending_approval' ? 'AWAITING AUTH' : ex.severity || 'OPEN'}
                  </span>
                </div>
                <p className="text-sm text-slate-600 truncate">{ex.rule?.description || 'Unknown error'}</p>
              </button>
            ))}
            {exceptions.length === 0 && (
              <div className="p-8 text-center text-slate-500">
                No open exceptions to review.
              </div>
            )}
          </div>
        </div>

        {/* Details and Authorization Workflow */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col overflow-y-auto">
          {selectedEx ? (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900 mb-2">Rule Violation</h2>
                <div className="p-4 bg-red-50 text-red-900 rounded-lg border border-red-100 flex items-start gap-3">
                  <ShieldAlert className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">{selectedEx.rule?.id || 'Validation Error'}</p>
                    <p className="text-sm mt-1">{selectedEx.rule?.description}</p>
                  </div>
                </div>
              </div>

              {/* Data Diff */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div>
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <FileJson className="h-4 w-4" /> Raw Source Row
                  </h3>
                  <div className="bg-slate-900 text-green-400 p-4 rounded-lg font-mono text-xs overflow-x-auto h-48 whitespace-pre-wrap">
                    {formatRawData(selectedEx.normalizedRecord?.rawRecord?.rawData)}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-brand-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <ArrowRight className="h-4 w-4" /> Parsed System Data
                  </h3>
                  <div className="bg-slate-50 text-slate-800 border border-slate-200 p-4 rounded-lg font-mono text-xs overflow-x-auto h-48 whitespace-pre-wrap">
                    {JSON.stringify(
                      Object.fromEntries(
                        Object.entries(selectedEx.normalizedRecord || {}).filter(([key]) => key !== 'rawRecord')
                      ), 
                      null, 2
                    )}
                  </div>
                </div>
              </div>

              {/* AI Copilot & Authorization Panel */}
              <div className="mt-auto border-t border-slate-200 pt-6">
                {!aiRec ? (
                  <button 
                    onClick={handleAskAI}
                    disabled={loadingAi}
                    className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium flex items-center justify-center transition-colors disabled:opacity-70 cursor-pointer"
                  >
                    {loadingAi ? (
                      <><Loader2 className="animate-spin h-5 w-5 mr-3" /> Analyzing Context & Generating Fix...</>
                    ) : (
                      <><Bot className="h-5 w-5 mr-3 text-brand-400" /> Ask AI Copilot for Recommendation</>
                    )}
                  </button>
                ) : (
                  <div className="bg-brand-50 border border-brand-200 rounded-xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-brand-500"></div>
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-bold text-brand-900 flex items-center gap-2">
                        <Bot className="h-5 w-5 text-brand-600" /> Copilot Analysis
                      </h3>
                      <span className="text-xs font-bold uppercase tracking-wide text-brand-600 bg-brand-100 px-2 py-1 rounded">
                        {aiRec.confidence} Confidence
                      </span>
                    </div>
                    
                    <p className="text-slate-700 mb-6">{aiRec.explanation}</p>
                    
                    <div className="bg-white rounded-lg p-4 border border-brand-100 mb-6 font-mono text-sm shadow-sm">
                      <span className="text-slate-400 text-xs uppercase mb-1 block">Suggested Correction Payload:</span>
                      {JSON.stringify(aiRec.suggestedCorrection, null, 2)}
                    </div>

                    {/* Role-Based Action Controls */}
                    {selectedEx.status === 'pending_approval' && userRole === 'operator' ? (
                      <button 
                        disabled 
                        className="w-full py-3 bg-slate-200 text-slate-500 font-bold rounded-lg flex justify-center items-center cursor-not-allowed"
                      >
                        <Lock className="h-5 w-5 mr-2" /> Locked - Pending Manager Review
                      </button>
                    ) : selectedEx.status === 'pending_approval' && userRole === 'manager' ? (
                      <button 
                        onClick={() => handleAction('authorize_fix')}
                        disabled={resolving}
                        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors cursor-pointer flex justify-center items-center"
                      >
                        {resolving ? (
                          <><Loader2 className="animate-spin h-5 w-5 mr-2" /> Authorizing...</>
                        ) : (
                          <><UserCheck className="h-5 w-5 mr-2" /> Authorize & Commit to Database</>
                        )}
                      </button>
                    ) : userRole === 'operator' ? (
                      <button 
                        onClick={() => handleAction('submit_for_approval')}
                        disabled={resolving}
                        className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-lg transition-colors cursor-pointer flex justify-center items-center"
                      >
                        {resolving ? (
                          <><Loader2 className="animate-spin h-5 w-5 mr-2" /> Submitting...</>
                        ) : (
                          <><CheckCircle2 className="h-5 w-5 mr-2" /> Submit Fix for Manager Approval</>
                        )}
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleAction('authorize_fix')}
                        disabled={resolving}
                        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors cursor-pointer flex justify-center items-center"
                      >
                        {resolving ? (
                          <><Loader2 className="animate-spin h-5 w-5 mr-2" /> Applying Direct Fix...</>
                        ) : (
                          <><UserCheck className="h-5 w-5 mr-2" /> Authorize & Apply Correction Immediately</>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <ShieldAlert className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-lg">Select an exception from the queue to review.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}