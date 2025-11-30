import React from 'react';
import { SplitPdfTool } from './components/SplitPdfTool';

function App() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 text-white p-1.5 rounded-lg font-bold text-lg">
              SM
            </div>
            <span className="font-bold text-slate-800 text-xl tracking-tight">SplitMaster <span className="text-blue-600">AI</span></span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#" className="hover:text-blue-600">Tools</a>
            <a href="#" className="hover:text-blue-600">Pricing</a>
            <a href="#" className="hover:text-blue-600">API</a>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <SplitPdfTool />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm">
          <p>© 2024 SplitMaster AI. All rights reserved.</p>
          <div className="flex justify-center gap-4 mt-2">
            <a href="#" className="hover:text-blue-600">Privacy Policy</a>
            <a href="#" className="hover:text-blue-600">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
