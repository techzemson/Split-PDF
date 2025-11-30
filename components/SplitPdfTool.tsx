import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  UploadCloudIcon, FileIcon, ScissorsIcon, SparklesIcon, 
  DownloadIcon, TrashIcon, CheckCircleIcon, RefreshCwIcon, ZapIcon,
  UndoIcon, RedoIcon, PaletteIcon, PlusIcon, XIcon
} from './Icons';
import { PdfPage, SplitRange, SplitMode, SplitResult, ProcessStep } from '../types';
import { RANGE_COLORS, MOCK_TOTAL_PAGES } from '../constants';
import { AnalysisCharts } from './AnalysisCharts';
import { getSmartSplitSuggestions } from '../services/geminiService';

export const SplitPdfTool: React.FC = () => {
  // -- State --
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PdfPage[]>([]);
  const [splitMode, setSplitMode] = useState<SplitMode>(SplitMode.RANGES);
  
  // Logic State
  const [ranges, setRanges] = useState<SplitRange[]>([]);
  
  // History State for Undo/Redo
  const [history, setHistory] = useState<SplitRange[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Visual Selection State
  const [selectionStart, setSelectionStart] = useState<number | null>(null);

  // Form Inputs
  const [fixedNumber, setFixedNumber] = useState<number>(1);
  const [extractInput, setExtractInput] = useState<string>("");
  const [aiPrompt, setAiPrompt] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [newRangeStart, setNewRangeStart] = useState<string>("");
  const [newRangeEnd, setNewRangeEnd] = useState<string>("");

  // Process State
  const [isProcessing, setIsProcessing] = useState(false);
  const [processSteps, setProcessSteps] = useState<ProcessStep[]>([]);
  const [results, setResults] = useState<SplitResult[] | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // -- Helpers --
  
  const updateRanges = useCallback((newRanges: SplitRange[]) => {
    // If we are at an index before the end, truncate future history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newRanges);
    
    // Limit history size
    if (newHistory.length > 20) newHistory.shift();

    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setRanges(newRanges);
  }, [history, historyIndex]);

  const undo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setRanges(history[prevIndex]);
      setHistoryIndex(prevIndex);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setRanges(history[nextIndex]);
      setHistoryIndex(nextIndex);
    }
  };

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
      const initialRanges = [{
        id: 'default-1',
        start: 1,
        end: MOCK_TOTAL_PAGES,
        label: 'Full Document',
        color: RANGE_COLORS[0]
      }];
      
      setRanges(initialRanges);
      setHistory([initialRanges]);
      setHistoryIndex(0);
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
    setHistory([]);
    setHistoryIndex(-1);
    setSelectionStart(null);
  };

  const handleAddRange = () => {
    const start = parseInt(newRangeStart);
    const end = parseInt(newRangeEnd);

    if (isNaN(start) || isNaN(end) || start > end || start < 1 || end > pages.length) {
      alert("Invalid page range. Please check your numbers.");
      return;
    }

    const newRange: SplitRange = {
      id: `manual-${Date.now()}`,
      start,
      end,
      label: `Range ${ranges.length + 1}`,
      color: RANGE_COLORS[ranges.length % RANGE_COLORS.length]
    };

    updateRanges([...ranges, newRange]);
    setNewRangeStart("");
    setNewRangeEnd("");
  };

  const handlePageClick = (pageNumber: number) => {
    if (splitMode !== SplitMode.RANGES) return;

    if (selectionStart === null) {
      setSelectionStart(pageNumber);
    } else {
      // Create range
      const start = Math.min(selectionStart, pageNumber);
      const end = Math.max(selectionStart, pageNumber);
      
      const newRange: SplitRange = {
        id: `visual-${Date.now()}`,
        start,
        end,
        label: `Range ${ranges.length + 1}`,
        color: RANGE_COLORS[ranges.length % RANGE_COLORS.length]
      };

      updateRanges([...ranges, newRange]);
      setSelectionStart(null);
    }
  };

  const updateRangeColor = (id: string, color: string) => {
    const newRanges = ranges.map(r => r.id === id ? { ...r, color } : r);
    updateRanges(newRanges);
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
      updateRanges(coloredRanges);
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

  const handleDownload = (fileName: string) => {
    // Create a mock PDF file (empty text file renamed)
    const content = "This is a mock PDF file content generated by the demo.";
    const blob = new Blob([content], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAll = () => {
      // Mock ZIP download
      const content = "Mock ZIP content";
      const blob = new Blob([content], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = "split_files.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  }

  // -- Render Helpers --

  // Determine if a page is in a specific range for coloring
  const getPageColor = (pageId: number) => {
    if (splitMode === SplitMode.RANGES) {
      const pageNumber = pageId + 1;
      // Prioritize active selection highlight
      if (selectionStart !== null && pageNumber === selectionStart) return '#2563eb'; // blue-600

      const range = ranges.find(r => pageNumber >= r.start && pageNumber <= r.end);
      return range ? range.color : 'transparent';
    }
    return 'transparent';
  };

  const getPageOpacity = (pageId: number) => {
    const pageNumber = pageId + 1;
    if (splitMode === SplitMode.RANGES) {
        if (selectionStart !== null && pageNumber === selectionStart) return 1;
        const range = ranges.find(r => pageNumber >= r.start && pageNumber <= r.end);
        return range ? 1 : 0.4; // Dim pages not in any range
    }
    return 1;
  }

  // -- Views --

  if (!file) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 transition-all">
        <h1 className="text-4xl font-bold text-slate-800 mb-8 mt-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">Split PDF with AI</h1>
        
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
            <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                <div className="flex justify-center mb-3"><ZapIcon className="text-amber-500 w-8 h-8" /></div>
                <h3 className="font-bold text-slate-800">Lightning Fast</h3>
                <p className="text-sm text-slate-500">Client-side processing simulation for instant feedback.</p>
            </div>
             <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                <div className="flex justify-center mb-3"><SparklesIcon className="text-purple-500 w-8 h-8" /></div>
                <h3 className="font-bold text-slate-800">AI Powered</h3>
                <p className="text-sm text-slate-500">Smart range detection using Gemini AI.</p>
            </div>
             <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                <div className="flex justify-center mb-3"><CheckCircleIcon className="text-green-500 w-8 h-8" /></div>
                <h3 className="font-bold text-slate-800">Secure & Private</h3>
                <p className="text-sm text-slate-500">Your files are processed securely.</p>
            </div>
        </div>
      </div>
    );
  }

  if (results) {
    return (
      <div className="max-w-6xl mx-auto p-6 animate-fade-in relative">
        <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-slate-800">Split Results</h2>
             <button 
                onClick={handleReset} 
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all transform hover:scale-105"
            >
                <RefreshCwIcon className="w-5 h-5" /> Split Another PDF
            </button>
        </div>

        <div className="text-center mb-10 bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircleIcon className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">Documents Ready!</h2>
          <p className="text-slate-600">Your PDF has been successfully split into {results.length} files.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                 <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                        <span className="font-semibold text-slate-700">Output Files</span>
                        <span className="text-sm text-slate-500">{results.length} items</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {results.map((res, idx) => (
                        <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                            <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center text-red-500">
                                <FileIcon />
                            </div>
                            <div>
                                <p className="font-medium text-slate-800 group-hover:text-blue-600 transition-colors">{res.fileName}</p>
                                <p className="text-xs text-slate-500">{res.pageCount} pages • {res.fileSize} MB</p>
                            </div>
                            </div>
                            <button 
                                onClick={() => handleDownload(res.fileName)}
                                className="flex items-center gap-2 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium"
                            >
                                <DownloadIcon className="w-4 h-4" /> Download
                            </button>
                        </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="lg:col-span-1">
                <div className="bg-slate-800 text-white rounded-2xl p-6 shadow-xl">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <DownloadIcon className="w-5 h-5"/> Quick Actions
                    </h3>
                    <p className="text-slate-300 text-sm mb-6">Download all split files at once in a compressed ZIP folder.</p>
                     <button 
                        onClick={handleDownloadAll}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-slate-900 font-bold hover:bg-slate-100 transition-colors"
                    >
                        <DownloadIcon className="w-4 h-4" /> Download All (ZIP)
                    </button>
                </div>
                 <div className="mt-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <SparklesIcon className="text-purple-500"/> Analysis
                    </h3>
                    <AnalysisCharts results={results} />
                </div>
            </div>
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
        <div className="p-6 border-b border-slate-100 bg-white sticky top-0 z-10">
          <h1 className="text-xl font-bold text-slate-800 mb-4">Split PDF with AI</h1>
          <div className="flex items-center gap-3 mb-6 p-3 bg-slate-50 rounded-lg border border-slate-100">
            <div className="w-10 h-10 bg-red-100 text-red-600 rounded-lg flex items-center justify-center shrink-0">
              <FileIcon />
            </div>
            <div className="overflow-hidden">
              <h3 className="font-bold text-slate-800 truncate text-sm">{file.name}</h3>
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
              <div className="animate-fade-in">
                {/* Manual Range Adder */}
                <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Quick Add Range</label>
                    <div className="flex items-center gap-2">
                        <input 
                            type="number" 
                            placeholder="Start"
                            className="w-full p-2 text-sm border border-slate-300 rounded focus:border-blue-500 outline-none"
                            value={newRangeStart}
                            onChange={e => setNewRangeStart(e.target.value)}
                        />
                        <span className="text-slate-400">-</span>
                        <input 
                            type="number" 
                            placeholder="End"
                            className="w-full p-2 text-sm border border-slate-300 rounded focus:border-blue-500 outline-none"
                            value={newRangeEnd}
                            onChange={e => setNewRangeEnd(e.target.value)}
                        />
                        <button 
                            onClick={handleAddRange}
                            className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
                            title="Add Range"
                        >
                            <PlusIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Undo/Redo Controls */}
                <div className="flex justify-between items-center mb-3">
                    <p className="text-sm text-slate-600 font-medium">Active Ranges</p>
                    <div className="flex gap-2">
                        <button 
                            onClick={undo} 
                            disabled={historyIndex <= 0}
                            className="p-1.5 hover:bg-slate-100 rounded text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Undo"
                        >
                            <UndoIcon className="w-4 h-4"/>
                        </button>
                        <button 
                            onClick={redo} 
                            disabled={historyIndex >= history.length - 1}
                            className="p-1.5 hover:bg-slate-100 rounded text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Redo"
                        >
                            <RedoIcon className="w-4 h-4"/>
                        </button>
                    </div>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {ranges.map((range, idx) => (
                    <div key={range.id} className="flex flex-col p-3 bg-white rounded-lg border border-slate-200 shadow-sm gap-2">
                       <div className="flex items-center gap-2">
                           {/* Color Picker Popover Trigger (Simplified as a cycle for now) */}
                           <button 
                                className="w-6 h-6 rounded-full shrink-0 border border-slate-200 shadow-sm"
                                style={{ backgroundColor: range.color }}
                                onClick={() => {
                                    const nextColorIndex = (RANGE_COLORS.indexOf(range.color) + 1) % RANGE_COLORS.length;
                                    updateRangeColor(range.id, RANGE_COLORS[nextColorIndex]);
                                }}
                                title="Click to change color"
                           />
                           
                           <span className="text-sm font-bold text-slate-700">Pages {range.start}-{range.end}</span>
                           
                           <div className="ml-auto flex gap-1">
                                <button 
                                    onClick={() => {
                                        const newRanges = ranges.filter(r => r.id !== range.id);
                                        updateRanges(newRanges);
                                    }}
                                    className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50"
                                >
                                    <TrashIcon className="w-4 h-4"/>
                                </button>
                           </div>
                       </div>
                       <input 
                            className="w-full text-sm bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none text-slate-600 focus:bg-white focus:border-blue-400"
                            value={range.label}
                            onChange={(e) => {
                                const newRanges = [...ranges];
                                newRanges[idx].label = e.target.value;
                                updateRanges(newRanges);
                            }}
                            placeholder="Range Label"
                        />
                    </div>
                  ))}
                  {ranges.length === 0 && (
                      <div className="text-center py-6 text-slate-400 text-sm italic">
                          No ranges added. Click pages or use the manual input.
                      </div>
                  )}
                </div>
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
                disabled={splitMode === SplitMode.RANGES && ranges.length === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
            >
                <ScissorsIcon className="w-5 h-5" /> Split PDF Now
            </button>
        </div>
      </aside>

      {/* Main Preview Area */}
      <main className="flex-1 overflow-y-auto p-8 relative">
         <div className="max-w-6xl mx-auto">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                 <div>
                    <h2 className="text-xl font-bold text-slate-800">Visual Page Selection</h2>
                    <p className="text-sm text-slate-500">
                        {splitMode === SplitMode.RANGES 
                            ? "Click a page to start/end a range. Click 'Add Range' manually if preferred." 
                            : "Preview of your document structure."}
                    </p>
                 </div>
                 
                 <div className="flex items-center gap-3 text-sm text-slate-500 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100">
                     <div className="flex items-center gap-1"><span className="w-3 h-3 bg-white border border-slate-300 rounded-sm"></span> Unselected</div>
                     <div className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rounded-sm"></span> In Range</div>
                     {selectionStart && (
                         <div className="flex items-center gap-1 text-blue-600 font-bold"><span className="w-3 h-3 bg-blue-600 rounded-sm animate-pulse"></span> Selecting...</div>
                     )}
                 </div>
             </div>

             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4 pb-20 select-none">
                {pages.map((page) => {
                    const color = getPageColor(page.id);
                    const opacity = getPageOpacity(page.id);
                    const isSelectionStart = selectionStart === page.pageNumber;

                    return (
                        <div 
                            key={page.id}
                            className={`
                                group relative aspect-[3/4] bg-white rounded-lg shadow-sm border-2 transition-all 
                                ${splitMode === SplitMode.RANGES ? 'cursor-pointer hover:shadow-md' : 'cursor-default'}
                                ${isSelectionStart ? 'ring-4 ring-blue-400 ring-opacity-50 border-blue-600 transform scale-105 z-10' : 'hover:scale-105'}
                            `}
                            style={{ 
                                borderColor: isSelectionStart ? '#2563eb' : (color !== 'transparent' ? color : '#e2e8f0'),
                                opacity: opacity
                            }}
                            onClick={() => handlePageClick(page.pageNumber)}
                        >
                            {/* Page Number Badge */}
                            <div 
                                className="absolute top-2 left-2 w-7 h-7 rounded-full text-xs flex items-center justify-center font-bold text-white z-10 shadow-sm"
                                style={{ backgroundColor: isSelectionStart ? '#2563eb' : (color !== 'transparent' ? color : '#94a3b8') }}
                            >
                                {page.pageNumber}
                            </div>

                            {/* Hover Overlay for Split Action */}
                            {splitMode === SplitMode.RANGES && !isSelectionStart && (
                                <div className="absolute inset-0 bg-blue-500 opacity-0 group-hover:opacity-10 transition-opacity rounded-lg"></div>
                            )}

                            {/* Range Label Overlay (if start of range) */}
                            {ranges.map(r => {
                                if (r.start === page.pageNumber && splitMode === SplitMode.RANGES) {
                                    return (
                                        <div key={r.id} className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap z-20 shadow-lg">
                                            {r.label}
                                        </div>
                                    )
                                }
                                return null;
                            })}

                            {/* Placeholder Content */}
                            <div className="absolute inset-4 flex flex-col gap-2 opacity-20 pointer-events-none">
                                <div className="h-2 bg-slate-800 rounded w-3/4"></div>
                                <div className="h-2 bg-slate-800 rounded w-full"></div>
                                <div className="h-2 bg-slate-800 rounded w-full"></div>
                                <div className="h-2 bg-slate-800 rounded w-5/6"></div>
                                <div className="h-2 bg-slate-800 rounded w-full"></div>
                                <div className="mt-auto h-10 bg-slate-200 rounded w-full"></div>
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