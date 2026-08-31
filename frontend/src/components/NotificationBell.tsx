import { useState, useEffect } from 'react';
import { Bell, AlertTriangle, ShieldCheck, Info } from 'lucide-react';

export default function NotificationBell() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const fetchAlerts = async () => {
    try {
      const res = await fetch('/api/alerts');
      const data = await res.json();
      setAlerts(data);
    } catch (err) {
      console.error('Failed to fetch alerts');
    }
  };

  useEffect(() => {
    fetchAlerts();
    // Poll for new alerts every 30 seconds
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const dismissAlert = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`/api/alerts/${id}/read`, { method: 'POST' });
    setAlerts(alerts.filter(a => a.id !== id));
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full relative transition-colors cursor-pointer"
      >
        <Bell className="h-5 w-5 text-slate-300" />
        {alerts.length > 0 && (
          <span className="absolute top-0 right-0 h-3 w-3 bg-red-500 rounded-full border-2 border-slate-900 animate-pulse"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50">
          <div className="bg-slate-50 border-b border-slate-200 p-3 flex justify-between items-center">
            <span className="font-bold text-slate-800 text-sm">System Alerts</span>
            <span className="text-xs font-bold bg-slate-200 text-slate-600 px-2 py-1 rounded-full">{alerts.length}</span>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm font-medium">
                No active system alerts.
              </div>
            ) : (
              alerts.map(alert => (
                <div key={alert.id} className="p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors flex gap-3 group">
                  <div className="mt-1">
                    {alert.severity === 'CRITICAL' ? <AlertTriangle className="h-5 w-5 text-red-500" /> :
                     alert.severity === 'WARNING' ? <Info className="h-5 w-5 text-yellow-500" /> :
                     <ShieldCheck className="h-5 w-5 text-green-500" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800 leading-tight">{alert.message}</p>
                    <p className="text-xs text-slate-400 mt-1">{new Date(alert.createdAt).toLocaleTimeString()}</p>
                  </div>
                  <button 
                    onClick={(e) => dismissAlert(alert.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-xs font-bold text-slate-400 hover:text-slate-700 transition-opacity"
                  >
                    Dismiss
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}