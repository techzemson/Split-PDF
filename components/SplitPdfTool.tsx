import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  UploadCloudIcon, FileIcon, ScissorsIcon, SparklesIcon, 
  DownloadIcon, TrashIcon, CheckCircleIcon, RefreshCwIcon, ZapIcon 
} from './Icons';
import { PdfPage, SplitRange, SplitMode, SplitResult, ProcessStep } from '../types';
import { RANGE_COLORS, MOCK_TOTAL_PAGES, ANIMATION_DELAY } from '../constants';
import { AnalysisCharts } from './AnalysisCharts';
import { getSmartSplitSuggestions } from '../services/geminiService';

export const SplitPdfTool: React.FC = () => {
  // -- State --
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PdfPage[]>([]);
  const [splitMode, setSplitMode] = useState<SplitMode>(SplitMode.RANGES);
  
  // Logic State
  const [ranges, setRanges] = useState<SplitRange[]>([]);
  const [fixedNumber, setFixedNumber] = useState<number>(1);
  const [extractInput, setExtractInput] = useState<string>("");
  const [aiPrompt, setAiPrompt] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Process State
  const [isProcessing, setIsProcessing] = useState(false);
  const [processSteps, setProcessSteps] = useState<ProcessStep[]>([]);
  const [results, setResults] = useState<SplitResult[] | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // -- Handlers --

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const uploadedFile = e.target.files[0];
      setFile(uploadedFile);
      
      // Simulate loading pages
      const newPages = Array.from({ length: MOCK_TOTAL_PAGES }, (_, i) => ({
        id: i,
        pageNumber: i + 1,
        selected: false,
      }));
      setPages(newPages);
      
      // Default range: All pages as one range initially
      setRanges([{
        id: 'default-1',
        start: 1,
        end: MOCK_TOTAL_PAGES,
        label: 'Full Document',
        color: RANGE_COLORS[0]
      }]);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPages([]);
    setRanges([]);
    setResults(null);
    setIsProcessing(false);
    setProcessSteps([]);
    setSplitMode(SplitMode.RANGES);
  };

  // -- AI Logic --
  const handleAiSmartSplit = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiLoading(true);
    try {
      const newRanges = await getSmartSplitSuggestions(aiPrompt, pages.length);
      const coloredRanges = newRanges.map((r, i) => ({
        ...r,
        color: RANGE_COLORS[i % RANGE_COLORS.length]
      }));
      setRanges(coloredRanges);
      setSplitMode(SplitMode.RANGES); // Switch to ranges view to show result
    } catch (err) {
      alert("AI could not determine split points. Please try a clearer prompt.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // -- Splitting Logic (Simulation) --
  const startSplitting = () => {
    setIsProcessing(true);
    setResults(null);
    setActiveStepIndex(0);

    const steps: ProcessStep[] = [
      { label: 'Analyzing PDF Structure...', progress: 0, status: 'pending' },
      { label: 'Extracting Page Data...', progress: 0, status: 'pending' },
      { label: 'Splitting Document...', progress: 0, status: 'pending' },
      { label: 'Compressing Output Files...', progress: 0, status: 'pending' },
      { label: 'Generating Analytics...', progress: 0, status: 'pending' },
    ];
    setProcessSteps(steps);
  };

  // Effect to drive the simulated progress
  useEffect(() => {
    if (!isProcessing || activeStepIndex >= processSteps.length) {
      if (isProcessing && activeStepIndex >= processSteps.length) {
        // Done
        finishProcessing();
      }
      return;
    }

    const timer = setTimeout(() => {
      setProcessSteps(prev => {
        const newSteps = [...prev];
        // Mark current as active or completed
        if (newSteps[activeStepIndex].status === 'pending') {
          newSteps[activeStepIndex].status = 'active';
          newSteps[activeStepIndex].progress = 10;
        } else if (newSteps[activeStepIndex].progress < 100) {
          newSteps[activeStepIndex].progress += 20; // Increment
        } else {
          newSteps[activeStepIndex].status = 'completed';
          setActiveStepIndex(idx => idx + 1);
        }
        return newSteps;
      });
    }, 400); // Speed of simulation

    return () => clearTimeout(timer);
  }, [isProcessing, activeStepIndex, processSteps]);

  const finishProcessing = () => {
    // Generate mock results based on current mode
    let generatedResults: SplitResult[] = [];
    const baseName = file?.name.replace('.pdf', '') || 'document';

    if (splitMode === SplitMode.RANGES || splitMode === SplitMode.AI_SMART) {
      generatedResults = ranges.map((r, i) => ({
        fileName: `${baseName}_part_${i + 1}_${r.label.replace(/\s+/g, '_')}.pdf`,
        pageCount: r.end - r.start + 1,
        fileSize: ((r.end - r.start + 1) * 0.15).toFixed(2), // Mock size logic
        originalName: baseName
      }));
    } else if (splitMode === SplitMode.FIXED) {
      const numFiles = Math.ceil(pages.length / fixedNumber);
      for (let i = 0; i < numFiles; i++) {
        const count = Math.min(fixedNumber, pages.length - (i * fixedNumber));
        generatedResults.push({
          fileName: `${baseName}_part_${i + 1}.pdf`,
          pageCount: count,
          fileSize: (count * 0.15).toFixed(2),
          originalName: baseName
        });
      }
    } else if (splitMode === SplitMode.EXTRACT) {
        // Mock extraction result
        const count = extractInput.split(',').length;
        generatedResults.push({
            fileName: `${baseName}_extracted.pdf`,
            pageCount: count,
            fileSize: (count * 0.15).toFixed(2),
            originalName: baseName
        })
    }

    setResults(generatedResults);
    setIsProcessing(false);
  };

  // -- Render Helpers --

  // Determine if a page is in a specific range for coloring
  const getPageColor = (pageId: number) => {
    if (splitMode === SplitMode.RANGES) {
      const range = ranges.find(r => pageId + 1 >= r.start && pageId + 1 <= r.end);
      return range ? range.color : 'transparent';
    }
    return 'transparent';
  };

  const getPageOpacity = (pageId: number) => {
    if (splitMode === SplitMode.RANGES) {
        const range = ranges.find(r => pageId + 1 >= r.start && pageId + 1 <= r.end);
        return range ? 1 : 0.3; // Dim pages not in any range
    }
    return 1;
  }

  // -- Views --

  if (!file) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 transition-all">
        <div 
          className="w-full max-w-2xl border-4 border-dashed border-slate-200 rounded-3xl bg-white p-16 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors group"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <UploadCloudIcon className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">Upload your PDF</h2>
          <p className="text-slate-500 mb-8 text-center max-w-md">Drag and drop your file here, or click to browse. We support large files up to 2GB.</p>
          <button className="bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold shadow-lg shadow-blue-200 hover:bg-blue-700 hover:shadow-blue-300 transition-all">
            Select PDF File
          </button>
          <input 
            type="file" 
            accept=".pdf" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileUpload}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 w-full max-w-4xl text-center">
            <div className="p-4">
                <div className="flex justify-center mb-3"><ZapIcon className="text-amber-500" /></div>
                <h3 className="font-bold text-slate-800">Lightning Fast</h3>
                <p className="text-sm text-slate-500">Client-side processing simulation for instant feedback.</p>
            </div>
             <div className="p-4">
                <div className="flex justify-center mb-3"><SparklesIcon className="text-purple-500" /></div>
                <h3 className="font-bold text-slate-800">AI Powered</h3>
                <p className="text-sm text-slate-500">Smart range detection using Gemini AI.</p>
            </div>
             <div className="p-4">
                <div className="flex justify-center mb-3"><CheckCircleIcon className="text-green-500" /></div>
                <h3 className="font-bold text-slate-800">Secure & Private</h3>
                <p className="text-sm text-slate-500">Your files are processed securely.</p>
            </div>
        </div>
      </div>
    );
  }

  if (results) {
    return (
      <div className="max-w-6xl mx-auto p-6 animate-fade-in">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircleIcon className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-slate-800">Documents Ready!</h2>
          <p className="text-slate-600">Your PDF has been successfully split into {results.length} files.</p>
        </div>

        <div className="mb-12">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <SparklesIcon className="text-purple-500"/> Result Analysis
            </h3>
            <AnalysisCharts results={results} />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <span className="font-semibold text-slate-700">Output Files</span>
            <span className="text-sm text-slate-500">{results.length} items</span>
          </div>
          <div className="divide-y divide-slate-100">
            {results.map((res, idx) => (
              <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center text-red-500">
                    <FileIcon />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{res.fileName}</p>
                    <p className="text-xs text-slate-500">{res.pageCount} pages • {res.fileSize} MB</p>
                  </div>
                </div>
                <button className="text-blue-600 hover:bg-blue-50 p-2 rounded-full transition-colors">
                  <DownloadIcon className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <button onClick={handleReset} className="flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors">
            <RefreshCwIcon className="w-4 h-4" /> Split Another PDF
          </button>
          <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 shadow-lg shadow-blue-200 transition-colors">
            <DownloadIcon className="w-4 h-4" /> Download All (ZIP)
          </button>
        </div>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="max-w-2xl mx-auto p-8 pt-20">
        <h2 className="text-2xl font-bold text-center mb-8 text-slate-800">Processing Your PDF</h2>
        <div className="space-y-6">
          {processSteps.map((step, idx) => (
            <div key={idx} className={`transition-all duration-500 ${step.status === 'pending' ? 'opacity-40' : 'opacity-100'}`}>
              <div className="flex justify-between mb-2">
                <span className={`font-medium ${step.status === 'completed' ? 'text-green-600' : 'text-slate-700'}`}>
                    {step.status === 'completed' && <CheckCircleIcon className="inline w-4 h-4 mr-2"/>}
                    {step.label}
                </span>
                <span className="text-sm font-mono text-slate-500">{step.progress}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ease-out ${step.status === 'completed' ? 'bg-green-500' : 'bg-blue-600'}`}
                  style={{ width: `${step.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center text-slate-400 text-sm animate-pulse">
            This might take a few seconds for large files...
        </div>
      </div>
    );
  }

  // -- Main Split Configuration UI --
  return (
    <div className="flex flex-col lg:flex-row h-screen max-h-[calc(100vh-80px)] overflow-hidden bg-slate-50/50">
      
      {/* Sidebar Controls */}
      <aside className="w-full lg:w-96 bg-white border-r border-slate-200 flex flex-col z-10 shadow-xl overflow-y-auto">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-red-100 text-red-600 rounded-lg flex items-center justify-center">
              <FileIcon />
            </div>
            <div className="overflow-hidden">
              <h3 className="font-bold text-slate-800 truncate">{file.name}</h3>
              <p className="text-xs text-slate-500">{pages.length} pages • {(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mb-6">
            <button 
                onClick={() => setSplitMode(SplitMode.RANGES)}
                className={`p-2 text-sm rounded-lg border transition-all ${splitMode === SplitMode.RANGES ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
                Custom Ranges
            </button>
            <button 
                onClick={() => setSplitMode(SplitMode.AI_SMART)}
                className={`p-2 text-sm rounded-lg border transition-all flex items-center justify-center gap-1 ${splitMode === SplitMode.AI_SMART ? 'bg-purple-50 border-purple-200 text-purple-700 font-medium' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
               <SparklesIcon className="w-3 h-3" /> AI Smart Split
            </button>
             <button 
                onClick={() => setSplitMode(SplitMode.FIXED)}
                className={`p-2 text-sm rounded-lg border transition-all ${splitMode === SplitMode.FIXED ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
                Fixed Ranges
            </button>
             <button 
                onClick={() => setSplitMode(SplitMode.EXTRACT)}
                className={`p-2 text-sm rounded-lg border transition-all ${splitMode === SplitMode.EXTRACT ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
                Extract Pages
            </button>
          </div>

          {/* Dynamic Control Panel based on Mode */}
          <div className="space-y-4">
            {splitMode === SplitMode.RANGES && (
              <div>
                <p className="text-sm text-slate-600 mb-3">Click on the pages on the right to start a new range, or add manually.</p>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {ranges.map((range, idx) => (
                    <div key={range.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded border border-slate-200">
                       <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: range.color }}></div>
                       <input 
                        className="w-12 text-sm bg-transparent border-b border-slate-300 focus:border-blue-500 outline-none text-center"
                        value={range.start}
                        readOnly
                       />
                       <span className="text-slate-400">-</span>
                       <input 
                        className="w-12 text-sm bg-transparent border-b border-slate-300 focus:border-blue-500 outline-none text-center"
                        value={range.end}
                        readOnly
                       />
                       <input 
                        className="flex-1 text-sm bg-transparent border-none outline-none text-right text-slate-600"
                        value={range.label}
                        onChange={(e) => {
                            const newRanges = [...ranges];
                            newRanges[idx].label = e.target.value;
                            setRanges(newRanges);
                        }}
                       />
                       <button 
                        onClick={() => {
                            if(ranges.length > 1) {
                                setRanges(ranges.filter(r => r.id !== range.id));
                            }
                        }}
                        className="text-slate-400 hover:text-red-500"
                       >
                           <TrashIcon className="w-4 h-4"/>
                       </button>
                    </div>
                  ))}
                </div>
                <button 
                    onClick={() => {
                        const lastEnd = ranges[ranges.length - 1]?.end || 0;
                        if (lastEnd < pages.length) {
                             setRanges([...ranges, {
                                id: Date.now().toString(),
                                start: lastEnd + 1,
                                end: pages.length,
                                label: `Part ${ranges.length + 1}`,
                                color: RANGE_COLORS[ranges.length % RANGE_COLORS.length]
                             }]);
                        }
                    }}
                    className="w-full mt-2 py-2 text-sm text-blue-600 border border-dashed border-blue-200 bg-blue-50 rounded hover:bg-blue-100"
                >
                    + Add Range
                </button>
              </div>
            )}

            {splitMode === SplitMode.AI_SMART && (
                <div className="animate-fade-in">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Describe how to split</label>
                    <textarea 
                        className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm min-h-[120px]"
                        placeholder="e.g., 'Split into 3 equal parts' or 'Separate the last 5 pages into a new file'"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                    />
                    <button 
                        onClick={handleAiSmartSplit}
                        disabled={isAiLoading || !aiPrompt}
                        className="w-full mt-3 bg-purple-600 text-white py-2 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isAiLoading ? <RefreshCwIcon className="animate-spin w-4 h-4"/> : <SparklesIcon className="w-4 h-4"/>}
                        {isAiLoading ? 'Analyzing...' : 'Generate Split Ranges'}
                    </button>
                    <p className="text-xs text-slate-500 mt-2">Gemini AI will analyze your request and automatically set the ranges for you.</p>
                </div>
            )}

            {splitMode === SplitMode.FIXED && (
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Split every X pages</label>
                    <input 
                        type="number" 
                        min="1" 
                        max={pages.length}
                        value={fixedNumber}
                        onChange={(e) => setFixedNumber(parseInt(e.target.value) || 1)}
                        className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                    <p className="text-xs text-slate-500 mt-2">
                        This will create {Math.ceil(pages.length / fixedNumber)} files.
                    </p>
                </div>
            )}

            {splitMode === SplitMode.EXTRACT && (
                <div>
                     <label className="block text-sm font-medium text-slate-700 mb-2">Pages to Extract</label>
                     <input 
                        type="text" 
                        placeholder="e.g. 1, 3, 5-8"
                        value={extractInput}
                        onChange={(e) => setExtractInput(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                     <p className="text-xs text-slate-500 mt-2">
                        Only the selected pages will be extracted into a new PDF.
                    </p>
                </div>
            )}
          </div>
        </div>

        <div className="p-6 mt-auto border-t border-slate-200 bg-slate-50">
            <button 
                onClick={startSplitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
            >
                <ScissorsIcon className="w-5 h-5" /> Split PDF Now
            </button>
        </div>
      </aside>

      {/* Main Preview Area */}
      <main className="flex-1 overflow-y-auto p-8 relative">
         <div className="max-w-5xl mx-auto">
             <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-bold text-slate-800">Page Preview</h2>
                 <div className="flex items-center gap-2 text-sm text-slate-500">
                     <span className="w-3 h-3 bg-white border border-slate-300 rounded-sm"></span> Unselected
                     <span className="w-3 h-3 bg-blue-500 rounded-sm ml-2"></span> Range 1
                     <span className="w-3 h-3 bg-red-500 rounded-sm ml-2"></span> Range 2
                 </div>
             </div>

             <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4 pb-20">
                {pages.map((page) => {
                    const color = getPageColor(page.id);
                    const opacity = getPageOpacity(page.id);
                    return (
                        <div 
                            key={page.id}
                            className="group relative aspect-[3/4] bg-white rounded-lg shadow-sm border-2 transition-all hover:scale-105 hover:shadow-md cursor-pointer"
                            style={{ 
                                borderColor: color !== 'transparent' ? color : '#e2e8f0',
                                opacity: opacity
                            }}
                            onClick={() => {
                                // Logic to split range at this point could go here
                            }}
                        >
                            {/* Page Number Badge */}
                            <div 
                                className="absolute top-2 left-2 w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold text-white z-10"
                                style={{ backgroundColor: color !== 'transparent' ? color : '#94a3b8' }}
                            >
                                {page.pageNumber}
                            </div>

                            {/* Range Indicator Line (Visual Connector) - Simplified for this demo */}
                            {color !== 'transparent' && (
                                <div className="absolute inset-0 bg-current opacity-5 pointer-events-none" style={{ color }}></div>
                            )}

                            {/* Placeholder Content */}
                            <div className="absolute inset-4 flex flex-col gap-2 opacity-20">
                                <div className="h-2 bg-slate-800 rounded w-3/4"></div>
                                <div className="h-2 bg-slate-800 rounded w-full"></div>
                                <div className="h-2 bg-slate-800 rounded w-full"></div>
                                <div className="h-2 bg-slate-800 rounded w-5/6"></div>
                                <div className="h-2 bg-slate-800 rounded w-full"></div>
                            </div>
                        </div>
                    );
                })}
             </div>
         </div>
      </main>
    </div>
  );
};
