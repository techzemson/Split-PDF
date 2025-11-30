import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { SplitResult } from '../types';
import { RANGE_COLORS } from '../constants';

interface AnalysisChartsProps {
  results: SplitResult[];
}

export const AnalysisCharts: React.FC<AnalysisChartsProps> = ({ results }) => {
  const data = results.map((r, i) => ({
    name: r.fileName,
    value: r.pageCount,
    size: parseFloat(r.fileSize),
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg text-sm">
          <p className="font-semibold text-slate-700">{payload[0].name}</p>
          <p className="text-blue-600">Pages: {payload[0].value}</p>
          <p className="text-slate-500">Size: {payload[0].payload.size} MB</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
      {/* Pie Chart: Page Distribution */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Page Distribution</h3>
        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={RANGE_COLORS[index % RANGE_COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="text-xs text-slate-500 mt-2 text-center">
          Visualizing how pages are distributed across files.
        </div>
      </div>

      {/* Bar Chart: File Sizes */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">File Size Analysis</h3>
        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" hide />
              <YAxis />
              <RechartsTooltip cursor={{fill: '#f1f5f9'}} content={<CustomTooltip />} />
              <Bar dataKey="size" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                 {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={RANGE_COLORS[index % RANGE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="text-xs text-slate-500 mt-2 text-center">
          Comparison of estimated output file sizes (MB).
        </div>
      </div>
    </div>
  );
};