// frontend/src/pages/FraudDetection.tsx
import { useState, useEffect } from 'react';
import { Network, AlertTriangle, ShieldAlert, Users, Lock, Loader2, CheckCircle2 } from 'lucide-react';

export default function FraudDetection() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/fraud/rings')
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => console.error(err));
  }, []);

  // NEW: The function to handle freezing the fraud ring
  const handleFreezeSyndicate = async (ring: any) => {
    setResolvingId(ring.ringId);
    
    try {
      await fetch('/api/fraud/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ringId: ring.ringId,
          loanIds: ring.nodes,
          action: 'freeze'
        })
      });

      // Remove the frozen ring from the UI and update the total count
      setData((prev: any) => ({
        totalRings: prev.totalRings - 1,
        rings: prev.rings.filter((r: any) => r.ringId !== ring.ringId)
      }));
    } catch (err) {
      console.error('Failed to freeze syndicate', err);
    } finally {
      setResolvingId(null);
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-slate-500">Running graph traversal algorithms...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Network className="h-8 w-8 text-brand-600" />
          Entity Resolution & Fraud Rings
        </h1>
        <p className="text-slate-500 mt-2">
          Using graph theory (DFS) to detect overlapping entities and organized syndicate risk.
        </p>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-red-100 p-3 rounded-full">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-red-900 uppercase tracking-wide">Threat Intelligence</p>
            <p className="text-2xl font-bold text-red-700">{data?.totalRings || 0} Risk Clusters Detected</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data?.rings.map((ring: any) => (
          <div key={ring.ringId} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <span className="bg-slate-900 text-white text-xs font-mono px-2 py-1 rounded">
                {ring.ringId}
              </span>
              <span className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wider ${
                ring.riskLevel === 'CRITICAL' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
              }`}>
                {ring.riskLevel}
              </span>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-slate-500 mb-1 flex items-center gap-2">
                <Users className="h-4 w-4" /> Component Size
              </p>
              <p className="text-xl font-bold text-slate-900">{ring.size} Linked Entities</p>
            </div>

            <div className="mb-6">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <ShieldAlert className="h-3 w-3" /> Implicated Nodes (Loan IDs)
              </p>
              <div className="bg-slate-50 rounded-lg p-3 max-h-32 overflow-y-auto border border-slate-100">
                <ul className="text-sm font-mono text-slate-600 space-y-1">
                  {ring.nodes.map((node: string) => (
                    <li key={node}>↳ {node}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* NEW: The Freeze Button */}
            <div className="mt-auto">
              <button 
                onClick={() => handleFreezeSyndicate(ring)}
                disabled={resolvingId === ring.ringId}
                className={`w-full py-3 rounded-lg font-medium flex items-center justify-center transition-colors ${
                  ring.riskLevel === 'CRITICAL' 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                } disabled:opacity-70 disabled:cursor-not-allowed`}
              >
                {resolvingId === ring.ringId ? (
                  <><Loader2 className="animate-spin h-5 w-5 mr-2" /> Freezing Accounts...</>
                ) : (
                  <><Lock className="h-4 w-4 mr-2" /> Freeze Syndicate</>
                )}
              </button>
            </div>
          </div>
        ))}

        {data?.rings.length === 0 && (
          <div className="col-span-full p-12 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-500 bg-white">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-bold text-slate-900 mb-1">Network Secure</h3>
            <p>All active fraud syndicates have been frozen. No overlapping entity clusters detected.</p>
          </div>
        )}
      </div>
    </div>
  );
}