import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { SplitResult } from '../types';
import { RANGE_COLORS } from '../constants';

interface AnalysisChartsProps {
  results: SplitResult[];
}

export const AnalysisCharts: React.FC<AnalysisChartsProps> = ({ results }) => {
  // Ensure we have data to prevent crashes
  if (!results || results.length === 0) return null;

  const data = results.map((r, i) => ({
    name: r.fileName.length > 20 ? r.fileName.substring(0, 15) + '...' : r.fileName,
    fullName: r.fileName,
    value: r.pageCount,
    size: parseFloat(r.fileSize),
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-xl rounded-lg text-sm z-50">
          <p className="font-semibold text-slate-800 mb-1">{payload[0].payload.fullName}</p>
          <div className="space-y-1">
            <p className="text-blue-600 font-medium">Pages: <span className="text-slate-700">{payload[0].value}</span></p>
            <p className="text-purple-600 font-medium">Size: <span className="text-slate-700">{payload[0].payload.size} MB</span></p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 gap-6 w-full">
      {/* Pie Chart: Page Distribution */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-6">Page Distribution</h3>
        <div className="w-full h-64 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={RANGE_COLORS[index % RANGE_COLORS.length]} 
                    className="hover:opacity-80 transition-opacity cursor-pointer"
                  />
                ))}
              </Pie>
              <RechartsTooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Center Text */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
            <span className="block text-3xl font-bold text-slate-800">{results.length}</span>
            <span className="text-xs text-slate-400 font-medium uppercase">Files</span>
          </div>
        </div>
      </div>

      {/* Bar Chart: File Sizes */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-6">Estimated File Sizes</h3>
        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#94a3b8', fontSize: 10}} 
                interval={0}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#94a3b8', fontSize: 10}}
              />
              <RechartsTooltip cursor={{fill: '#f8fafc'}} content={<CustomTooltip />} />
              <Bar dataKey="size" radius={[4, 4, 0, 0]} maxBarSize={50}>
                 {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={RANGE_COLORS[index % RANGE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};