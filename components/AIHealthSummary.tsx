'use client';
import { Activity, Brain } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line } from 'recharts';
export default function AIHealthSummary() {
  const healthSparkline = [
    { v: 95 }, { v: 96 }, { v: 97 }, { v: 96 }, { v: 98 }, { v: 98 }
  ];
  const aiSparkline = [
    { v: 90 }, { v: 91 }, { v: 93 }, { v: 92 }, { v: 94 }, { v: 94 }
  ];
  return (<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Card 1: Network Health */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:bg-slate-100 dark:hover:bg-white/10 hover:border-slate-400 dark:hover:border-white/20 transition-all">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Network Health</span>
            <div className="flex items-baseline gap-2 mt-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Activity className="w-5 h-5" />
              </div>
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">98%</span>
            </div>
            <div className="mt-2 text-[11px] flex items-center gap-1.5 font-medium">
              <span className="text-emerald-600 dark:text-emerald-400">Excellent</span>
              <span className="text-slate-600">•</span>
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center">
                ↑ 2% <span className="text-slate-500 dark:text-slate-400 font-normal ml-0.5">จากชั่วโมงที่แล้ว</span>
              </span>
            </div>
          </div>
          <div className="h-10 mt-3 -mx-4 -mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={healthSparkline}>
                <Line type="monotone" dataKey="v" stroke="#22C55E" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 2: AI Confidence */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:bg-slate-100 dark:hover:bg-white/10 hover:border-slate-400 dark:hover:border-white/20 transition-all">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">AI Confidence</span>
            <div className="flex items-baseline gap-2 mt-2">
              <div className="w-8 h-8 rounded-xl bg-purple-500/15 flex items-center justify-center text-purple-600 dark:text-purple-400 border border-purple-500/20">
                <Brain className="w-5 h-5" />
              </div>
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">94%</span>
            </div>
            <div className="mt-2 text-[11px] flex items-center gap-1.5 font-medium">
              <span className="text-purple-600 dark:text-purple-400">High Confidence</span>
              <span className="text-slate-600">•</span>
              <span className="text-purple-600 dark:text-purple-400 flex items-center">
                ↑ 3% <span className="text-slate-500 dark:text-slate-400 font-normal ml-0.5">จากชั่วโมงที่แล้ว</span>
              </span>
            </div>
          </div>
          <div className="h-10 mt-3 -mx-4 -mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={aiSparkline}>
                <Line type="monotone" dataKey="v" stroke="#8B5CF6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

</div>);
}
