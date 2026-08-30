'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Maximize2, Minimize2, Calendar, Clock, RefreshCw } from 'lucide-react';

interface TopBarProps {
  collapsed: boolean;
  activeAlertCount?: number;
  onRefresh?: () => void;
  title?: string;
  subtitle?: string;
}

export default function TopBar({
  collapsed,
  activeAlertCount = 5,
  onRefresh,
  title,
  subtitle,
}: TopBarProps) {
  const [timeString, setTimeString] = useState('');
  const [dateString, setDateString] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();

      // Format time: HH:mm:ss
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      setTimeString(`${hours}:${minutes}:${seconds}`);

      // Format Thai date: 24 พฤษภาคม 2569
      const thaiMonths = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
      ];
      const day = now.getDate();
      const month = thaiMonths[now.getMonth()];
      const year = now.getFullYear() + 543; // BE year
      setDateString(`${day} ${month} ${year}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  return (
    <header
      className={`h-[56px] bg-[#020617]/60 backdrop-blur-xl border-b border-white/10 px-4 flex items-center justify-between fixed top-0 right-0 z-30 shadow-sm transition-all duration-300 ${
        collapsed ? "left-[72px]" : "left-[240px]"
      }`}
    >
      {/* Left: Page Info */}
      <div className="flex items-center gap-3">
        {(title || subtitle) && (
          <div className="hidden md:flex flex-col">
            {title && <h1 className="text-sm font-semibold text-white leading-none tracking-tight">{title}</h1>}
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
        )}
      </div>

      {/* Center: Realtime Clock & Thai Date */}
      <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 shadow-sm">
        <div className="flex items-center gap-1.5 text-blue-400 font-mono text-sm font-bold tracking-wider">
          <Clock className="w-4 h-4 text-blue-400 animate-pulse" />
          <span>{timeString || '15:42:18'}</span>
        </div>
        <div className="h-3 w-[1px] bg-white/10"></div>
        <div className="flex items-center gap-1.5 text-xs text-slate-300">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{dateString || '24 พฤษภาคม 2569'}</span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors border border-transparent hover:border-white/10"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}

        {/* System Healthy Badge */}
        <div className="hidden sm:flex items-center gap-2 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">System Healthy</span>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors relative border border-transparent hover:border-white/10">
            <Bell className="w-5 h-5" />
            {activeAlertCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse shadow-lg shadow-rose-500/30">
                {activeAlertCount}
              </span>
            )}
          </button>
        </div>

        {/* Fullscreen */}
        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors border border-transparent hover:border-white/10"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
}
