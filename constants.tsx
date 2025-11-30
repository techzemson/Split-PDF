import React from 'react';

// Using a predefined set of colors for range visualization
export const RANGE_COLORS = [
  '#3b82f6', // blue-500
  '#ef4444', // red-500
  '#10b981', // green-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
];

export const MOCK_TOTAL_PAGES = 45; // Simulating a mid-sized PDF

export const ANIMATION_DELAY = 600; // ms between progress steps

// Minimal valid PDF binary string content to ensure downloaded files open
export const MINIMAL_PDF_DATA = `%PDF-1.7
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 /MediaBox [0 0 595 842] >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << >> /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT /F1 24 Tf 100 700 Td (SplitMaster Output PDF) Tj ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000060 00000 n 
0000000157 00000 n 
0000000246 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
340
%%EOF`;