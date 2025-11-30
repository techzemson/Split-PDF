import React, { useState, useEffect, useRef, useCallback } from 'react';
import JSZip from 'jszip';
import { PDFDocument, degrees } from 'pdf-lib';
import { 
  UploadCloudIcon, FileIcon, ScissorsIcon, SparklesIcon, 
  DownloadIcon, TrashIcon, CheckCircleIcon, RefreshCwIcon, ZapIcon,
  UndoIcon, RedoIcon, PaletteIcon, PlusIcon, XIcon
} from './Icons';
import { PdfPage, SplitRange, SplitMode, SplitResult, ProcessStep } from '../types';
import { RANGE_COLORS } from '../constants';
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

  // View Options
  const [zoomLevel, setZoomLevel] = useState<number>(5); // Used for Grid column calculation

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const uploadedFile = e.target.files[0];
      
      try {
        const arrayBuffer = await uploadedFile.arrayBuffer();
        // Load the PDF to get the real page count
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const pageCount = pdfDoc.getPageCount();

        setFile(uploadedFile);
        
        // Generate pages based on actual PDF count
        const newPages: PdfPage[] = Array.from({ length: pageCount }, (_, i) => ({
          id: i,
          pageNumber: i + 1,
          selected: false,
          rotation: 0
        }));
        setPages(newPages);
        
        // Default: No ranges active initially
        setRanges([]);
        setHistory([[]]);
        setHistoryIndex(0);
      } catch (error) {
        console.error("Error loading PDF:", error);
        alert("Failed to load PDF file. Please ensure it is a valid PDF.");
      }
    }
  };

  const handleReset = () => {
    // Revoke any existing object URLs to free memory
    if (results) {
        results.forEach(r => URL.revokeObjectURL(r.downloadUrl));
    }
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
      alert(`Invalid page range. Please use numbers between 1 and ${pages.length}.`);
      return;
    }

    const newRange: SplitRange = {
      id: `manual-${Date.now()}`,
      start,
      end,
      label: `Part ${ranges.length + 1}`,
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
        label: `Part ${ranges.length + 1}`,
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

  const handleRotatePage = (e: React.MouseEvent, pageId: number) => {
    e.stopPropagation(); // Prevent range selection
    setPages(prev => prev.map(p => {
        if (p.id === pageId) {
            return { ...p, rotation: (p.rotation + 90) % 360 };
        }
        return p;
    }));
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

  // -- Splitting Logic (Real) --
  const startSplitting = () => {
    setIsProcessing(true);
    setResults(null);
    setActiveStepIndex(0);

    const steps: ProcessStep[] = [
      { label: 'Reading Document...', progress: 0, status: 'pending' },
      { label: 'Processing Rotations...', progress: 0, status: 'pending' },
      { label: 'Splitting Pages...', progress: 0, status: 'pending' },
      { label: 'Generating Files...', progress: 0, status: 'pending' },
      { label: 'Finalizing...', progress: 0, status: 'pending' },
    ];
    setProcessSteps(steps);
  };

  // Effect to drive the simulated progress visualization while actually working
  useEffect(() => {
    if (!isProcessing || activeStepIndex >= processSteps.length) {
      if (isProcessing && activeStepIndex >= processSteps.length) {
        performRealSplitting();
      }
      return;
    }

    const timer = setTimeout(() => {
      setProcessSteps(prev => {
        const newSteps = [...prev];
        if (newSteps[activeStepIndex].status === 'pending') {
          newSteps[activeStepIndex].status = 'active';
          newSteps[activeStepIndex].progress = 10;
        } else if (newSteps[activeStepIndex].progress < 100) {
          newSteps[activeStepIndex].progress += 30;
        } else {
          newSteps[activeStepIndex].status = 'completed';
          setActiveStepIndex(idx => idx + 1);
        }
        return newSteps;
      });
    }, 200); // Fast visual updates

    return () => clearTimeout(timer);
  }, [isProcessing, activeStepIndex, processSteps]);

  const performRealSplitting = async () => {
    if (!file) return;

    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const generatedResults: SplitResult[] = [];
        const baseName = file.name.replace('.pdf', '');

        // Helper to extract pages and save as a new PDF
        const createPdfFromPages = async (pageIndices: number[], fileName: string) => {
            const subDoc = await PDFDocument.create();
            // Copy pages from original
            const copiedPages = await subDoc.copyPages(pdfDoc, pageIndices);
            
            copiedPages.forEach((page, idx) => {
                // Apply rotation if needed
                const originalPageId = pageIndices[idx];
                const pageState = pages.find(p => p.id === originalPageId);
                if (pageState && pageState.rotation !== 0) {
                    const existingRotation = page.getRotation().angle;
                    page.setRotation(degrees(existingRotation + pageState.rotation));
                }
                subDoc.addPage(page);
            });

            const pdfBytes = await subDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            
            return {
                fileName: fileName,
                pageCount: pageIndices.length,
                fileSize: (pdfBytes.byteLength / 1024 / 1024).toFixed(2), // MB
                originalName: file.name,
                downloadUrl: url
            };
        };

        if (splitMode === SplitMode.RANGES || splitMode === SplitMode.AI_SMART) {
            for (let i = 0; i < ranges.length; i++) {
                const r = ranges[i];
                const indices = [];
                for (let j = r.start - 1; j < r.end; j++) indices.push(j); // 0-based
                
                const result = await createPdfFromPages(indices, `${baseName}_part_${i + 1}_${r.label.replace(/\s+/g, '_')}.pdf`);
                generatedResults.push(result);
            }
        } else if (splitMode === SplitMode.FIXED) {
             const totalPages = pdfDoc.getPageCount();
             let part = 1;
             for (let i = 0; i < totalPages; i += fixedNumber) {
                 const indices = [];
                 for (let j = i; j < Math.min(i + fixedNumber, totalPages); j++) {
                     indices.push(j);
                 }
                 const result = await createPdfFromPages(indices, `${baseName}_part_${part}.pdf`);
                 generatedResults.push(result);
                 part++;
             }
        } else if (splitMode === SplitMode.EXTRACT) {
             // Parse input string "1, 3, 5-8"
             const parts = extractInput.split(',').map(p => p.trim());
             const indices = new Set<number>();
             
             parts.forEach(part => {
                 if (part.includes('-')) {
                     const [start, end] = part.split('-').map(Number);
                     if (!isNaN(start) && !isNaN(end)) {
                         for(let i = start; i <= end; i++) indices.add(i - 1);
                     }
                 } else {
                     const num = parseInt(part);
                     if (!isNaN(num)) indices.add(num - 1);
                 }
             });

             const validIndices = Array.from(indices).filter(i => i >= 0 && i < pages.length).sort((a, b) => a - b);
             if (validIndices.length > 0) {
                 const result = await createPdfFromPages(validIndices, `${baseName}_extracted.pdf`);
                 generatedResults.push(result);
             }
        }

        setResults(generatedResults);
    } catch (error) {
        console.error("Splitting failed:", error);
        alert("An error occurred while splitting the PDF.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDownload = (url: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAll = async () => {
      if (!results) return;
      
      const zip = new JSZip();
      
      // We need to fetch the blob from the URL to add to zip
      for (const res of results) {
          const blob = await fetch(res.downloadUrl).then(r => r.blob());
          zip.file(res.fileName, blob);
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${file?.name.replace('.pdf', '')}_split_files.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  }

  // -- Render Helpers --

  const getPageColor = (pageId: number) => {
    if (splitMode === SplitMode.RANGES) {
      const pageNumber = pageId + 1;
      if (selectionStart !== null && pageNumber === selectionStart) return '#3b82f6';
      const range = ranges.find(r => pageNumber >= r.start && pageNumber <= r.end);
      return range ? range.color : 'transparent';
    }
    return 'transparent';
  };

  const getPageOpacity = (pageId: number) => {
    const pageNumber = pageId + 1;
    if (splitMode === SplitMode.RANGES) {
        if (selectionStart !== null) {
            if (pageNumber === selectionStart) return 1;
            return 0.5;
        }
        if (ranges.length > 0) {
             const range = ranges.find(r => pageNumber >= r.start && pageNumber <= r.end);
             return range ? 1 : 0.4;
        }
    }
    return 1;
  }

  // -- Views --

  if (!file) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 animate-fade-in">
        <h1 className="text-5xl font-extrabold text-slate-800 mb-2 mt-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            Split PDF with AI
        </h1>
        <p className="text-slate-500 mb-10 text-lg">Intelligent splitting, custom ranges, and lightning fast processing.</p>
        
        <div 
          className="w-full max-w-2xl border-4 border-dashed border-slate-200 rounded-[2rem] bg-white p-16 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all duration-300 group shadow-sm hover:shadow-md"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-inner">
            <UploadCloudIcon className="w-12 h-12 text-blue-600" />
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-3">Upload your PDF</h2>
          <p className="text-slate-500 mb-8 text-center max-w-md text-base leading-relaxed">
            Drag and drop your file here, or click to browse. 
            <br/>Supports PDFs up to 2GB.
          </p>
          <button className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-10 py-4 rounded-xl font-bold shadow-lg shadow-blue-200 hover:shadow-blue-300 hover:-translate-y-1 transition-all">
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
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 w-full max-w-5xl text-center">
            <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="flex justify-center mb-4"><ZapIcon className="text-amber-500 w-10 h-10" /></div>
                <h3 className="font-bold text-lg text-slate-800 mb-1">Instant Split</h3>
                <p className="text-sm text-slate-500">Process files in seconds directly in your browser.</p>
            </div>
             <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="flex justify-center mb-4"><SparklesIcon className="text-purple-500 w-10 h-10" /></div>
                <h3 className="font-bold text-lg text-slate-800 mb-1">AI Powered</h3>
                <p className="text-sm text-slate-500">Auto-detect logical split points with Gemini AI.</p>
            </div>
             <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="flex justify-center mb-4"><CheckCircleIcon className="text-green-500 w-10 h-10" /></div>
                <h3 className="font-bold text-lg text-slate-800 mb-1">100% Free</h3>
                <p className="text-sm text-slate-500">No limits on pages or file size. Completely free.</p>
            </div>
        </div>
      </div>
    );
  }

  if (results) {
    return (
      <div className="max-w-7xl mx-auto p-6 animate-fade-in relative min-h-[80vh]">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircleIcon className="w-6 h-6 text-green-600" />
                 </div>
                 <div>
                     <h2 className="text-lg font-bold text-slate-800">Processing Complete</h2>
                     <p className="text-xs text-slate-500">Success • {results.length} files created</p>
                 </div>
            </div>
             <button 
                onClick={handleReset} 
                className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-0.5"
            >
                <RefreshCwIcon className="w-5 h-5" /> Split Another PDF
            </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                 <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                        <span className="font-bold text-slate-700 text-lg">Your Files</span>
                        <span className="text-xs font-medium px-3 py-1 bg-white border border-slate-200 rounded-full text-slate-500">
                            Total: {(results.reduce((acc, curr) => acc + parseFloat(curr.fileSize), 0)).toFixed(2)} MB
                        </span>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                        {results.map((res, idx) => (
                        <div key={idx} className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-slate-50 transition-colors group gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-500 shadow-sm border border-red-100">
                                    <FileIcon className="w-6 h-6"/>
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors text-sm sm:text-base break-all">
                                        {res.fileName}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                                        <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">{res.pageCount} Pages</span>
                                        <span>•</span>
                                        <span>{res.fileSize} MB</span>
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => handleDownload(res.downloadUrl, res.fileName)}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-200 hover:border-blue-600 px-4 py-2 rounded-lg transition-all text-sm font-bold"
                            >
                                <DownloadIcon className="w-4 h-4" /> Download
                            </button>
                        </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="lg:col-span-1 space-y-6">
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-10 -mt-10"></div>
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 relative z-10">
                        <DownloadIcon className="w-5 h-5"/> Quick Download
                    </h3>
                    <p className="text-slate-300 text-sm mb-6 relative z-10 leading-relaxed">
                        Save time by downloading all {results.length} split files in a single compressed ZIP archive.
                    </p>
                     <button 
                        onClick={handleDownloadAll}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-slate-900 font-bold hover:bg-blue-50 transition-colors shadow-lg"
                    >
                        <DownloadIcon className="w-4 h-4" /> Download All (ZIP)
                    </button>
                </div>
                 <div className="mt-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 px-2">
                        <SparklesIcon className="text-purple-500 w-5 h-5"/> Insight Analysis
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
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
            <h2 className="text-3xl font-bold text-center mb-10 text-slate-800">Processing Your PDF</h2>
            <div className="space-y-8">
            {processSteps.map((step, idx) => (
                <div key={idx} className={`transition-all duration-500 ${step.status === 'pending' ? 'opacity-30 scale-95' : 'opacity-100 scale-100'}`}>
                <div className="flex justify-between mb-2">
                    <span className={`font-semibold text-sm ${step.status === 'completed' ? 'text-green-600' : 'text-slate-700'}`}>
                        {step.status === 'completed' && <CheckCircleIcon className="inline w-4 h-4 mr-2 -mt-0.5"/>}
                        {step.label}
                    </span>
                    <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{step.progress}%</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                    <div 
                    className={`h-full transition-all duration-300 ease-out rounded-full ${step.status === 'completed' ? 'bg-green-500' : 'bg-gradient-to-r from-blue-500 to-indigo-600'}`}
                    style={{ width: `${step.progress}%` }}
                    />
                </div>
                </div>
            ))}
            </div>
            <div className="mt-12 text-center text-slate-400 text-sm animate-pulse">
                Please wait while we magic happens...
            </div>
        </div>
      </div>
    );
  }

  // -- Main Split Configuration UI --
  return (
    <div className="flex flex-col lg:flex-row h-screen max-h-[calc(100vh-64px)] overflow-hidden bg-slate-50/50">
      
      {/* Sidebar Controls */}
      <aside className="w-full lg:w-[400px] bg-white border-r border-slate-200 flex flex-col z-20 shadow-xl">
        <div className="p-5 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3 mb-6 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
            <div className="w-10 h-10 bg-white text-red-500 rounded-lg flex items-center justify-center shrink-0 shadow-sm border border-slate-100">
              <FileIcon />
            </div>
            <div className="overflow-hidden">
              <h3 className="font-bold text-slate-800 truncate text-sm">{file.name}</h3>
              <p className="text-xs text-slate-500">{pages.length} pages • {(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <button onClick={handleReset} className="ml-auto text-slate-400 hover:text-red-500 p-1">
                <XIcon className="w-5 h-5" />
            </button>
          </div>
          
          <div className="grid grid-cols-4 gap-1 mb-6 bg-slate-100 p-1 rounded-xl">
            {[
                { mode: SplitMode.RANGES, label: 'Custom', icon: null },
                { mode: SplitMode.AI_SMART, label: 'AI Auto', icon: <SparklesIcon className="w-3 h-3"/> },
                { mode: SplitMode.FIXED, label: 'Fixed', icon: null },
                { mode: SplitMode.EXTRACT, label: 'Extract', icon: null }
            ].map(item => (
                <button 
                    key={item.mode}
                    onClick={() => setSplitMode(item.mode)}
                    className={`
                        py-2 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1
                        ${splitMode === item.mode 
                            ? 'bg-white text-blue-600 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                        }
                    `}
                >
                   {item.icon} {item.label}
                </button>
            ))}
          </div>

          {/* Dynamic Control Panel based on Mode */}
          <div className="space-y-4 max-h-[calc(100vh-350px)] overflow-y-auto px-1 custom-scrollbar">
            {splitMode === SplitMode.RANGES && (
              <div className="animate-fade-in space-y-4">
                
                {/* Manual Range Adder */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 shadow-sm">
                    <label className="text-xs font-bold text-slate-500 uppercase mb-3 block tracking-wide">Add Page Range</label>
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                             <input 
                                type="number" 
                                placeholder="Start"
                                min="1"
                                className="w-full p-2.5 pl-3 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                value={newRangeStart}
                                onChange={e => setNewRangeStart(e.target.value)}
                            />
                        </div>
                        <span className="text-slate-400 font-bold">-</span>
                        <div className="relative flex-1">
                             <input 
                                type="number" 
                                placeholder="End"
                                min="1"
                                className="w-full p-2.5 pl-3 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                value={newRangeEnd}
                                onChange={e => setNewRangeEnd(e.target.value)}
                            />
                        </div>
                        <button 
                            onClick={handleAddRange}
                            className="bg-blue-600 text-white p-2.5 rounded-lg hover:bg-blue-700 shadow-md shadow-blue-100 active:scale-95 transition-all"
                            title="Add Range"
                        >
                            <PlusIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Undo/Redo Controls */}
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <p className="text-sm text-slate-600 font-bold">Split Segments ({ranges.length})</p>
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                        <button 
                            onClick={undo} 
                            disabled={historyIndex <= 0}
                            className="p-1.5 hover:bg-white hover:shadow-sm rounded text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            title="Undo"
                        >
                            <UndoIcon className="w-4 h-4"/>
                        </button>
                        <div className="w-px bg-slate-300 my-1"></div>
                        <button 
                            onClick={redo} 
                            disabled={historyIndex >= history.length - 1}
                            className="p-1.5 hover:bg-white hover:shadow-sm rounded text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            title="Redo"
                        >
                            <RedoIcon className="w-4 h-4"/>
                        </button>
                    </div>
                </div>

                <div className="space-y-2.5">
                  {ranges.map((range, idx) => (
                    <div key={range.id} className="group flex flex-col p-3 bg-white rounded-xl border border-slate-200 shadow-sm gap-2 hover:border-blue-300 hover:shadow-md transition-all">
                       <div className="flex items-center gap-3">
                           {/* Range Color Indicator / Picker */}
                           <div className="relative group/picker">
                                <button 
                                        className="w-8 h-8 rounded-lg shrink-0 border border-slate-200 shadow-sm flex items-center justify-center transition-transform active:scale-95"
                                        style={{ backgroundColor: range.color }}
                                        onClick={() => {
                                            const nextColorIndex = (RANGE_COLORS.indexOf(range.color) + 1) % RANGE_COLORS.length;
                                            updateRangeColor(range.id, RANGE_COLORS[nextColorIndex]);
                                        }}
                                        title="Click to cycle color"
                                >
                                    <PaletteIcon className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md"/>
                                </button>
                           </div>
                           
                           <div className="flex flex-col">
                               <span className="text-xs font-bold text-slate-400 uppercase">Pages</span>
                               <span className="text-sm font-bold text-slate-800">{range.start} - {range.end}</span>
                           </div>
                           
                           <div className="ml-auto flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => {
                                        const newRanges = ranges.filter(r => r.id !== range.id);
                                        updateRanges(newRanges);
                                    }}
                                    className="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors"
                                    title="Remove Range"
                                >
                                    <TrashIcon className="w-4 h-4"/>
                                </button>
                           </div>
                       </div>
                       <input 
                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none text-slate-600 focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all placeholder:text-slate-400"
                            value={range.label}
                            onChange={(e) => {
                                const newRanges = [...ranges];
                                newRanges[idx].label = e.target.value;
                                updateRanges(newRanges);
                            }}
                            placeholder="Type a label (e.g. Chapter 1)..."
                        />
                    </div>
                  ))}
                  {ranges.length === 0 && (
                      <div className="text-center py-10 px-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50">
                          <p className="text-slate-400 text-sm mb-1">No ranges defined yet.</p>
                          <p className="text-slate-500 text-xs">Click on pages in the preview or use the "Add Page Range" box above.</p>
                      </div>
                  )}
                </div>
              </div>
            )}

            {splitMode === SplitMode.AI_SMART && (
                <div className="animate-fade-in">
                    <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 mb-4">
                        <div className="flex items-center gap-2 mb-2 text-purple-700 font-bold text-sm">
                            <SparklesIcon className="w-4 h-4"/> AI Assistant
                        </div>
                        <p className="text-xs text-purple-600">
                            Describe how you want to split the document. The AI will detect logical sections.
                        </p>
                    </div>
                    
                    <label className="block text-sm font-bold text-slate-700 mb-2">Instructions</label>
                    <textarea 
                        className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm min-h-[140px] shadow-sm resize-none"
                        placeholder="Examples:&#10;- Split into 3 equal parts&#10;- Separate the first 2 pages and the last page&#10;- Create a new file every 10 pages"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                    />
                    <button 
                        onClick={handleAiSmartSplit}
                        disabled={isAiLoading || !aiPrompt}
                        className="w-full mt-4 bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-purple-200 transition-all"
                    >
                        {isAiLoading ? <RefreshCwIcon className="animate-spin w-4 h-4"/> : <SparklesIcon className="w-4 h-4"/>}
                        {isAiLoading ? 'Analyzing Structure...' : 'Generate Split Ranges'}
                    </button>
                </div>
            )}

            {splitMode === SplitMode.FIXED && (
                <div className="animate-fade-in p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Split every X pages</label>
                    <div className="flex items-center gap-4">
                        <input 
                            type="number" 
                            min="1" 
                            max={pages.length}
                            value={fixedNumber}
                            onChange={(e) => setFixedNumber(parseInt(e.target.value) || 1)}
                            className="w-24 p-3 border border-slate-300 rounded-lg text-center font-bold text-lg focus:border-blue-500 outline-none"
                        />
                        <span className="text-sm text-slate-500">pages</span>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-200">
                        <p className="text-sm text-slate-600 flex justify-between">
                            <span>Total Files:</span>
                            <span className="font-bold">{Math.ceil(pages.length / fixedNumber)}</span>
                        </p>
                    </div>
                </div>
            )}

            {splitMode === SplitMode.EXTRACT && (
                <div className="animate-fade-in">
                     <label className="block text-sm font-bold text-slate-700 mb-2">Pages to Extract</label>
                     <input 
                        type="text" 
                        placeholder="e.g. 1, 3, 5-8"
                        value={extractInput}
                        onChange={(e) => setExtractInput(e.target.value)}
                        className="w-full p-3 border border-slate-300 rounded-xl focus:border-blue-500 outline-none shadow-sm"
                    />
                     <p className="text-xs text-slate-500 mt-2 bg-blue-50 p-3 rounded-lg text-blue-700">
                        Only the selected pages will be extracted into a single new PDF file.
                    </p>
                </div>
            )}
          </div>
        </div>

        <div className="p-6 mt-auto border-t border-slate-200 bg-slate-50">
            <button 
                onClick={startSplitting}
                disabled={splitMode === SplitMode.RANGES && ranges.length === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-200 hover:shadow-blue-300 transform active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
                <ScissorsIcon className="w-5 h-5" /> Split PDF Now
            </button>
        </div>
      </aside>

      {/* Main Preview Area */}
      <main className="flex-1 overflow-y-auto bg-slate-100/50 p-6 lg:p-10 relative">
         <div className="max-w-[1600px] mx-auto">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4 sticky top-0 z-10 bg-slate-100/90 backdrop-blur-sm py-4 border-b border-slate-200/50">
                 <div>
                    <h2 className="text-2xl font-bold text-slate-800">Visual Editor</h2>
                    <p className="text-sm text-slate-500 mt-1">
                        {splitMode === SplitMode.RANGES 
                            ? "Click start and end pages to define a range." 
                            : "Document preview."}
                    </p>
                 </div>
                 
                 <div className="flex items-center gap-4">
                     {/* Zoom Controls */}
                     <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                         <span className="text-xs font-bold text-slate-400 uppercase">Zoom</span>
                         <input 
                            type="range" 
                            min="3" 
                            max="10" 
                            step="1"
                            value={zoomLevel}
                            onChange={(e) => setZoomLevel(parseInt(e.target.value))}
                            className="w-24 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                         />
                     </div>

                     <div className="hidden lg:flex items-center gap-3 text-xs font-medium text-slate-500 bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200">
                         <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-white border border-slate-300 rounded-sm"></span> Unselected</div>
                         <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-blue-500 rounded-sm"></span> Selected</div>
                         {selectionStart && (
                             <div className="flex items-center gap-1.5 text-blue-600 font-bold"><span className="w-2 h-2 bg-blue-600 rounded-full animate-ping"></span> Picking End...</div>
                         )}
                     </div>
                 </div>
             </div>

             <div 
                className="grid gap-6 pb-20 select-none transition-all duration-300 ease-in-out"
                style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${14 - zoomLevel}rem, 1fr))` }}
             >
                {pages.map((page) => {
                    const color = getPageColor(page.id);
                    const opacity = getPageOpacity(page.id);
                    const isSelectionStart = selectionStart === page.pageNumber;

                    return (
                        <div 
                            key={page.id}
                            className={`
                                group relative aspect-[3/4] bg-white rounded-xl shadow-sm border transition-all duration-200
                                ${splitMode === SplitMode.RANGES ? 'cursor-pointer hover:shadow-lg hover:-translate-y-1' : 'cursor-default'}
                                ${isSelectionStart ? 'ring-4 ring-blue-400 ring-opacity-50 border-blue-600 z-10 scale-105' : ''}
                            `}
                            style={{ 
                                borderColor: isSelectionStart ? '#2563eb' : (color !== 'transparent' ? color : '#e2e8f0'),
                                opacity: opacity,
                                transform: `rotate(${page.rotation}deg) ${isSelectionStart ? 'scale(1.05)' : ''}`
                            }}
                            onClick={() => handlePageClick(page.pageNumber)}
                        >
                            {/* Page Number Badge */}
                            <div 
                                className="absolute top-3 left-3 w-8 h-8 rounded-lg text-xs flex items-center justify-center font-bold text-white z-10 shadow-md transition-colors"
                                style={{ backgroundColor: isSelectionStart ? '#2563eb' : (color !== 'transparent' ? color : '#94a3b8') }}
                            >
                                {page.pageNumber}
                            </div>

                            {/* Rotate Button (Hover) */}
                            <button 
                                className="absolute top-3 right-3 p-1.5 bg-white/90 rounded-full shadow-sm hover:bg-white hover:text-blue-600 text-slate-400 opacity-0 group-hover:opacity-100 transition-all z-20"
                                onClick={(e) => handleRotatePage(e, page.id)}
                                title="Rotate Page"
                            >
                                <RefreshCwIcon className="w-3 h-3" />
                            </button>

                            {/* Range Label Overlay */}
                            {ranges.map(r => {
                                if (r.start === page.pageNumber && splitMode === SplitMode.RANGES) {
                                    return (
                                        <div key={r.id} className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap z-20 shadow-lg border-2 border-white">
                                            {r.label}
                                        </div>
                                    )
                                }
                                return null;
                            })}

                            {/* Content Placeholder */}
                            <div className="absolute inset-6 flex flex-col gap-3 opacity-10 pointer-events-none overflow-hidden">
                                <div className="h-4 bg-slate-900 rounded w-3/4 mb-2"></div>
                                <div className="h-2 bg-slate-800 rounded w-full"></div>
                                <div className="h-2 bg-slate-800 rounded w-full"></div>
                                <div className="h-2 bg-slate-800 rounded w-5/6"></div>
                                <div className="h-2 bg-slate-800 rounded w-full"></div>
                                <div className="h-2 bg-slate-800 rounded w-4/5"></div>
                                <div className="mt-auto h-24 bg-slate-200 rounded w-full"></div>
                            </div>
                            
                            {/* Selection Overlay */}
                             {splitMode === SplitMode.RANGES && !isSelectionStart && (
                                <div className="absolute inset-0 bg-blue-500 opacity-0 group-hover:opacity-5 transition-opacity rounded-xl"></div>
                            )}
                        </div>
                    );
                })}
             </div>
         </div>
      </main>
    </div>
  );
};