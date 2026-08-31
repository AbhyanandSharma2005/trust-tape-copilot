import { Link, useLocation } from 'react-router-dom';
import { Database, ShieldAlert, Network, FileText } from 'lucide-react';

export default function Navbar() {
  const location = useLocation();

  const navItemClass = (path: string) => `
    flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors
    ${location.pathname === path 
      ? 'bg-brand-50 text-brand-600' 
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
  `;

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          <div className="flex items-center gap-2">
            <div className="bg-brand-600 p-2 rounded-lg">
              <ShieldAlert className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">
              TrustTape <span className="text-brand-600">Copilot</span>
            </span>
          </div>

          <div className="flex space-x-2">
            <Link to="/" className={navItemClass('/')}>
              <Database className="h-4 w-4" />
              Data Ingestion
            </Link>
            <Link to="/review" className={navItemClass('/review')}>
              <ShieldAlert className="h-4 w-4" />
              Review Queue
            </Link>
            <Link to="/fraud" className={navItemClass('/fraud')}>
              <Network className="h-4 w-4" />
              Fraud Intelligence
            </Link>
            <Link to="/report" className={navItemClass('/report')}>
              <FileText className="h-4 w-4" />
              Executive Report
            </Link>
          </div>

        </div>
      </div>
    </nav>
  );
}