import { useState } from 'react';
import { LayoutDashboard, Network, FileText, Users } from 'lucide-react';
import { DashboardPage } from './components/DashboardPage';
import { StructurePage } from './components/StructurePage';

// Hopps Logo Component
function HoppsLogo() {
  return (
    <div className="flex items-center justify-center w-16 h-16 bg-purple-600 rounded-lg">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path
          d="M8 8h6v6H8V8zm0 10h6v6H8v-6zm10-10h6v6h-6V8z"
          fill="white"
        />
        <path d="M18 18h6v6h-6v-6z" fill="white" opacity="0.6" />
      </svg>
    </div>
  );
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'structure' | 'receipts' | 'admin'>('structure');

  return (
    <div className="flex h-screen bg-purple-50/30">
      {/* Sidebar */}
      <div className="w-28 bg-white border-r border-gray-200 flex flex-col items-center py-6 gap-8">
        <HoppsLogo />

        <nav className="flex flex-col items-center gap-6 flex-1">
          <button
            onClick={() => setCurrentPage('dashboard')}
            className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-colors ${
              currentPage === 'dashboard'
                ? 'bg-purple-100 text-purple-600'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <LayoutDashboard className="w-6 h-6" />
            <span className="text-xs">Dashboard</span>
          </button>

          <button
            onClick={() => setCurrentPage('receipts')}
            className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-colors ${
              currentPage === 'receipts'
                ? 'bg-purple-100 text-purple-600'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FileText className="w-6 h-6" />
            <span className="text-xs">Receipts</span>
          </button>

          <button
            onClick={() => setCurrentPage('structure')}
            className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-colors ${
              currentPage === 'structure'
                ? 'bg-purple-100 text-purple-600'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Network className="w-6 h-6" />
            <span className="text-xs">Structure</span>
          </button>

          <button
            onClick={() => setCurrentPage('admin')}
            className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-colors ${
              currentPage === 'admin'
                ? 'bg-purple-100 text-purple-600'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Users className="w-6 h-6" />
            <span className="text-xs">Admin</span>
          </button>
        </nav>

        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 bg-purple-200 rounded-full flex items-center justify-center">
            <span className="text-purple-700 text-sm">MS</span>
          </div>
          <span className="text-xs text-gray-600">Marie Stiller</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {currentPage === 'dashboard' && <DashboardPage />}
        {currentPage === 'structure' && <StructurePage />}
        {currentPage === 'receipts' && (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Belege Seite - Coming soon</p>
          </div>
        )}
        {currentPage === 'admin' && (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Admin Seite - Coming soon</p>
          </div>
        )}
      </div>
    </div>
  );
}
