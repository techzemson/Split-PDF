import React from 'react';
import { 
  XIcon, CheckCircleIcon, ZapIcon, SparklesIcon, 
  ScissorsIcon, FileIcon, PaletteIcon, RefreshCwIcon, UploadCloudIcon
} from './Icons';

interface DocumentationProps {
  onClose: () => void;
}

export const Documentation: React.FC<DocumentationProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col relative animate-scale-up">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                 <FileIcon className="w-6 h-6"/>
             </div>
             <div>
                <h2 className="text-2xl font-bold text-slate-800">Documentation & Guide</h2>
                <p className="text-slate-500 text-sm">Mastering SplitMaster AI</p>
             </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-red-500"
          >
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-8 custom-scrollbar space-y-12">
           
           {/* Section 1: Intro */}
           <div className="prose prose-slate max-w-none">
              <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <ZapIcon className="text-amber-500" /> Getting Started
              </h3>
              <p className="text-slate-600 leading-relaxed mb-6">
                  SplitMaster AI is an advanced, free-to-use tool designed to handle all your PDF splitting needs directly in your browser. 
                  Unlike other tools, we prioritize privacy and speed by processing files on your device.
              </p>
              
              <div className="grid md:grid-cols-3 gap-6">
                  <div className="bg-blue-50 p-5 rounded-xl border border-blue-100">
                      <div className="font-bold text-blue-800 mb-2 flex items-center gap-2">1. Upload</div>
                      <p className="text-sm text-blue-700">Drag & drop your PDF file or click to select from your device. Supports large files.</p>
                  </div>
                  <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100">
                      <div className="font-bold text-indigo-800 mb-2 flex items-center gap-2">2. Configure</div>
                      <p className="text-sm text-indigo-700">Choose from Custom Ranges, AI Smart Split, Fixed Splits, or Page Extraction.</p>
                  </div>
                  <div className="bg-green-50 p-5 rounded-xl border border-green-100">
                      <div className="font-bold text-green-800 mb-2 flex items-center gap-2">3. Download</div>
                      <p className="text-sm text-green-700">Get your split files instantly. Download individually or as a ZIP archive.</p>
                  </div>
              </div>
           </div>

           <hr className="border-slate-100" />

           {/* Section 2: Features */}
           <div>
              <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <SparklesIcon className="text-purple-500" /> Key Features & Tools
              </h3>
              
              <div className="grid md:grid-cols-2 gap-8">
                  {/* Feature 1 */}
                  <div className="flex gap-4">
                      <div className="mt-1">
                          <div className="w-10 h-10 bg-white border border-slate-200 shadow-sm rounded-lg flex items-center justify-center text-blue-600">
                              <ScissorsIcon className="w-5 h-5"/>
                          </div>
                      </div>
                      <div>
                          <h4 className="font-bold text-slate-800 text-lg">Visual Range Editor</h4>
                          <p className="text-slate-500 text-sm mt-1 leading-relaxed">
                              Click on a <strong>Start Page</strong> and an <strong>End Page</strong> in the preview grid to visually define a split range. 
                              You can assign different colors to ranges for better organization.
                          </p>
                      </div>
                  </div>

                  {/* Feature 2 */}
                  <div className="flex gap-4">
                      <div className="mt-1">
                          <div className="w-10 h-10 bg-white border border-slate-200 shadow-sm rounded-lg flex items-center justify-center text-purple-600">
                              <SparklesIcon className="w-5 h-5"/>
                          </div>
                      </div>
                      <div>
                          <h4 className="font-bold text-slate-800 text-lg">AI Smart Split</h4>
                          <p className="text-slate-500 text-sm mt-1 leading-relaxed">
                              Not sure where to split? Use natural language! Type "Split by chapter" or "Separate the appendix", and our Gemini AI integration will intelligently suggest the best page ranges for you.
                          </p>
                      </div>
                  </div>

                  {/* Feature 3 */}
                  <div className="flex gap-4">
                      <div className="mt-1">
                          <div className="w-10 h-10 bg-white border border-slate-200 shadow-sm rounded-lg flex items-center justify-center text-orange-500">
                              <RefreshCwIcon className="w-5 h-5"/>
                          </div>
                      </div>
                      <div>
                          <h4 className="font-bold text-slate-800 text-lg">Page Rotation</h4>
                          <p className="text-slate-500 text-sm mt-1 leading-relaxed">
                             Fix upside-down pages before splitting. Simply hover over any page card in the visual editor and click the rotate icon. The final PDF will preserve these rotations.
                          </p>
                      </div>
                  </div>

                  {/* Feature 4 */}
                  <div className="flex gap-4">
                      <div className="mt-1">
                          <div className="w-10 h-10 bg-white border border-slate-200 shadow-sm rounded-lg flex items-center justify-center text-pink-500">
                              <PaletteIcon className="w-5 h-5"/>
                          </div>
                      </div>
                      <div>
                          <h4 className="font-bold text-slate-800 text-lg">Color Coding & Labels</h4>
                          <p className="text-slate-500 text-sm mt-1 leading-relaxed">
                              Organize your splits visually. Assign unique colors to different sections and give them custom labels (e.g., "Chapter 1"). These labels will be part of the downloaded filenames.
                          </p>
                      </div>
                  </div>
              </div>
           </div>

           <hr className="border-slate-100" />

           {/* Section 3: Benefits */}
           <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100">
              <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <CheckCircleIcon className="text-green-500" /> Why use SplitMaster AI?
              </h3>
              <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                      <CheckCircleIcon className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                      <div>
                          <strong className="text-slate-800 block">100% Client-Side Privacy</strong>
                          <span className="text-slate-600 text-sm">Your files never leave your browser. Processing happens locally on your machine, ensuring maximum security for sensitive documents.</span>
                      </div>
                  </li>
                  <li className="flex items-start gap-3">
                      <CheckCircleIcon className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                      <div>
                          <strong className="text-slate-800 block">Visual Verification</strong>
                          <span className="text-slate-600 text-sm">Don't guess page numbers. See exactly what you are splitting with our high-fidelity grid preview and zoom controls.</span>
                      </div>
                  </li>
                  <li className="flex items-start gap-3">
                      <CheckCircleIcon className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                      <div>
                          <strong className="text-slate-800 block">Advanced Export Options</strong>
                          <span className="text-slate-600 text-sm">Download files individually or grab everything at once with a generated ZIP archive. We also provide file size estimates before you download.</span>
                      </div>
                  </li>
              </ul>
           </div>

        </div>
        
        {/* Footer Action */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
            <button 
                onClick={onClose}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-200"
            >
                Got it, Let's Split!
            </button>
        </div>
      </div>
    </div>
  );
}