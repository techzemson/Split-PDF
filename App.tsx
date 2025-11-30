import React from 'react';
import { SplitPdfTool } from './components/SplitPdfTool';

function App() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white p-2 rounded-xl font-bold text-xl shadow-lg shadow-blue-200">
              SM
            </div>
            <span className="font-bold text-slate-800 text-xl tracking-tight">SplitMaster <span className="text-blue-600">AI</span></span>
          </div>
          {/* Links removed as requested */}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <SplitPdfTool />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-400 text-xs">
          {/* Footer content removed as requested */}
          <p>Powered by Gemini AI • Client-side Processing</p>
        </div>
      </footer>
    </div>
  );
}

export default App;