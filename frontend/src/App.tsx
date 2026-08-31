// frontend/src/App.tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import ReviewQueue from './pages/ReviewQueue';
import FraudDetection from './pages/FraudDetection';
import ExecutiveReport from './pages/ExecutiveReport';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/review" element={<ReviewQueue />} />
            <Route path="/fraud" element={<FraudDetection />} />
            <Route path="/report" element={<ExecutiveReport />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}