export interface PdfPage {
  id: number;
  pageNumber: number;
  selected: boolean;
  thumbnail?: string; // In a real app, this would be a blob URL
  rotation: number; // 0, 90, 180, 270
}

export interface SplitRange {
  id: string;
  start: number;
  end: number;
  label: string;
  color: string;
}

export enum SplitMode {
  RANGES = 'ranges',
  EXTRACT = 'extract',
  FIXED = 'fixed',
  AI_SMART = 'ai_smart'
}

export interface SplitResult {
  fileName: string;
  pageCount: number;
  fileSize: string;
  originalName: string;
  downloadUrl: string;
}

export interface ProcessStep {
  label: string;
  progress: number; // 0-100
  status: 'pending' | 'active' | 'completed';
}