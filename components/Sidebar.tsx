'use client';

import React, { useState } from 'react';
import {
  LayoutDashboard,
  Network,
  Sparkles,
  ShieldCheck,
  BarChart3,
  Settings,
  Brain,
  ChevronRight,
  UserCheck,
  LogOut,
  ShieldAlert,
  Server
} from 'lucide-react';
import { UserRole } from '@/types/ai-noc';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  pendingApprovalCount?: number;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
  userRole,
  setUserRole,
  pendingApprovalCount = 3,
}: SidebarProps) {
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      subtitle: 'ภาพรวมสุขภาพระบบ',
      icon: LayoutDashboard,
    },
    {
      id: 'infrastructure',
      label: 'Infrastructure',
      subtitle: 'Topology & Monitoring',
      icon: Network,
    },
    {
      id: 'ai-analysis',
      label: 'AI Analysis',
      subtitle: 'Diagnosis & Assistant',
      icon: Sparkles,
      badge: 'AI',
    },
    {
      id: 'action-center',
      label: 'Action Center',
      subtitle: 'Recommendation & Approval',
      icon: ShieldCheck,
      badgeCount: 3,
    },
    {
      id: 'reports',
      label: 'Reports & Analytics',
      subtitle: 'Reports & Insights',
      icon: BarChart3,
    },
    {
      id: 'settings',
      label: 'Settings & Admin',
      subtitle: 'Users, Telegram & Audit',
      icon: Settings,
    },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 bottom-0 z-40 bg-[#020617]/70 backdrop-blur-xl border-r border-white/10 transition-all duration-300 flex flex-col ${
        collapsed ? 'w-[72px]' : 'w-[240px]'
      }`}
    >
      {/* Brand Logo Header */}
      <div className="h-[60px] px-4 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3 overflow-hidden cursor-pointer" onClick={() => setActiveTab('dashboard')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
            <Brain className="w-6 h-6 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="font-bold text-lg text-white leading-none tracking-tight">AI-NOC</span>
              <span className="text-[10px] text-slate-400 truncate mt-1">v2.4.0 • Operation Center</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={collapsed ? `${item.label} - ${item.subtitle}` : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left group relative ${
                isActive
                  ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-500/10'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <div className="shrink-0 relative">
                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                {item.badgeCount && collapsed && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                    {item.badgeCount}
                  </span>
                )}
              </div>

              {!collapsed && (
                <div className="flex-1 min-w-0 pr-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate leading-snug">{item.label}</span>
                    {item.badge && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {item.badge}
                      </span>
                    )}
                    {item.badgeCount && !item.badge && (
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-rose-500 text-white">
                        {item.badgeCount}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[11px] block truncate mt-0.5 ${
                      isActive ? 'text-blue-300/80' : 'text-slate-500 group-hover:text-slate-400'
                    }`}
                  >
                    {item.subtitle}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Profile Card at Bottom */}
      <div className="p-3 border-t border-white/10 relative bg-black/20 backdrop-blur-md">
        {showRoleMenu && !collapsed && (
          <div className="absolute bottom-16 left-3 right-3 bg-slate-900/90 backdrop-blur-2xl border border-white/15 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-bottom-2">
            <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider border-b border-white/10 mb-1">
              สลับบทบาทผู้ใช้ (RBAC Demo)
            </div>
            <button
              onClick={() => {
                setUserRole('admin');
                setShowRoleMenu(false);
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs ${
                userRole === 'admin' ? 'bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30' : 'text-slate-200 hover:bg-white/5'
              }`}
            >
              <span>Admin (สิทธิ์เต็ม)</span>
              {userRole === 'admin' && <UserCheck className="w-3.5 h-3.5 text-blue-400" />}
            </button>
            <button
              onClick={() => {
                setUserRole('engineer');
                setShowRoleMenu(false);
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs ${
                userRole === 'engineer' ? 'bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30' : 'text-slate-200 hover:bg-white/5'
              }`}
            >
              <span>NOC Engineer</span>
              {userRole === 'engineer' && <UserCheck className="w-3.5 h-3.5 text-blue-400" />}
            </button>
            <button
              onClick={() => {
                setUserRole('viewer');
                setShowRoleMenu(false);
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs ${
                userRole === 'viewer' ? 'bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30' : 'text-slate-200 hover:bg-white/5'
              }`}
            >
              <span>Viewer (Read-Only)</span>
              {userRole === 'viewer' && <UserCheck className="w-3.5 h-3.5 text-blue-400" />}
            </button>
          </div>
        )}

        <div
          onClick={() => !collapsed && setShowRoleMenu(!showRoleMenu)}
          className={`flex items-center gap-3 p-2 rounded-xl transition-colors ${
            collapsed ? 'justify-center' : 'hover:bg-white/5 cursor-pointer'
          }`}
        >
          <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-white text-sm shadow">
              AD
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#020617] rounded-full"></span>
          </div>

          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white truncate">admin</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded uppercase">
                  {userRole}
                </span>
              </div>
              <span className="text-xs text-slate-400 truncate block">Network Administrator</span>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Online
              </span>
            </div>
          )}

          {!collapsed && <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />}
        </div>
      </div>
    </aside>
  );
}
