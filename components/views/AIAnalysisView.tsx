'use client';

import React, { useState } from 'react';
import {
  Brain,
  Sparkles,
  AlertTriangle,
  Clock,
  Send,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Share2,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
  Database,
  Layers,
  ShieldAlert,
  Search,
  Plus,
  MessageSquare,
  Activity,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { Diagnosis, Incident, ChatSession, ChatMessage } from '@/types/ai-noc';

interface AIAnalysisViewProps {
  diagnosis: Diagnosis;
  incident: Incident;
  chatSessions: ChatSession[];
  chatMessages: ChatMessage[];
  initialSubTab?: string;
  onNavigateTab: (tab: string, subtab?: string) => void;
}

export default function AIAnalysisView({
  diagnosis,
  incident,
  chatSessions,
  chatMessages: initialMessages,
  initialSubTab = 'diagnosis',
  onNavigateTab,
}: AIAnalysisViewProps) {
  const [subTab, setSubTab] = useState<'diagnosis' | 'chat'>(
    initialSubTab === 'chat' ? 'chat' : 'diagnosis'
  );
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState('chat-01');

  // Handle sending chat query to Gemini API
  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputQuery;
    if (!query.trim() || isLoadingAi) return;

    const userMsg: ChatMessage = {
      id: `msg-user-${messages.length + 1}`,
      sessionId: activeSessionId,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoadingAi(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query }),
      });

      const data = await res.json();

      const aiMsg: ChatMessage = {
        id: `msg-ai-${messages.length + 2}`,
        sessionId: activeSessionId,
        role: 'assistant',
        content: data.reply || 'ขออภัย ไม่สามารถดึงคำตอบจาก AI ได้ในขณะนี้',
        timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        citedEntities: data.citedEntities,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error('Chat error:', err);
      const errorMsg: ChatMessage = {
        id: `msg-err-${messages.length + 2}`,
        sessionId: activeSessionId,
        role: 'assistant',
        content: 'เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI Engine โปรดลองอีกครั้ง',
        timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoadingAi(false);
    }
  };

  const suggestedPrompts = [
    'แสดง Host ที่มี Storage Latency สูง',
    'แสดง VM ที่ได้รับผลกระทบ',
    'จะแก้ไขปัญหานี้อย่างไร?'
  ];

  return (
    <div className="space-y-6 pb-6 animate-in fade-in duration-300">
      {/* SubTab Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Brain className="w-6 h-6 text-purple-400" />
            AI Analysis
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {subTab === 'diagnosis'
              ? 'การวิเคราะห์สาเหตุของปัญหาด้วย AI (Root Cause Analysis & Evidence Chain)'
              : 'สอบถามปัญหาและรับคำอธิบายจาก AI (AI Chat Assistant powered by Gemini 3.6 Flash)'}
          </p>
        </div>

        <div className="flex items-center gap-1 bg-white/5 backdrop-blur-md p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setSubTab('diagnosis')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              subTab === 'diagnosis'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            AI Diagnosis (RCA)
          </button>
          <button
            onClick={() => setSubTab('chat')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              subTab === 'chat'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            AI Chat Assistant
          </button>
        </div>
      </div>

      {/* SUBTAB 1: AI DIAGNOSIS (RCA) */}
      {subTab === 'diagnosis' && (
        <div className="space-y-6">
          {/* Incident Header */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 space-y-4 shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div className="flex items-start gap-3">
                <span className="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 font-bold text-xs uppercase animate-pulse">
                  {incident.severity}
                </span>
                <div>
                  <h3 className="font-extrabold text-xl text-white">{incident.title}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-1 font-mono">
                    <span>Incident ID : <strong>{incident.id}</strong></span>
                    <span>•</span>
                    <span>Detected : {incident.detectedAt}</span>
                    <span>•</span>
                    <span>Duration : <strong>2h 23m</strong></span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onNavigateTab('action-center', 'approvals')}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg transition-all flex items-center gap-2 shrink-0"
              >
                ดูการอนุมัติแก้ไขปัญหานี้ <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* AI Analysis Summary Card with Confidence Dial */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-black/20 border border-white/10 rounded-xl p-5 backdrop-blur-sm">
              {/* Confidence Dial Ring */}
              <div className="md:col-span-3 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-white/10 pb-4 md:pb-0 md:pr-6">
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <div className="w-full h-full rounded-full border-8 border-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                    <span className="text-3xl font-extrabold text-white tabular-nums">{diagnosis.confidence}%</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-400 mt-2 uppercase tracking-wider">AI Confidence Score</span>
                <span className="text-[10px] text-slate-400">{diagnosis.modelUsed}</span>
              </div>

              {/* Root Cause Summary Text */}
              <div className="md:col-span-9 space-y-3">
                <div>
                  <span className="text-xs font-bold text-purple-400 uppercase tracking-wider block mb-1">
                    Root Cause (สาเหตุของปัญหาที่พบ):
                  </span>
                  <h4 className="font-extrabold text-lg text-red-400">
                    {diagnosis.rootCauseTitle}
                  </h4>
                  <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                    {diagnosis.rootCauseSummary}
                  </p>
                </div>

                {/* 4 Key Metric Info Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2">
                  <div className="bg-white/5 p-2.5 rounded-lg border border-white/10">
                    <span className="text-slate-400 block text-[10px]">Impact Level</span>
                    <span className="font-bold text-red-400 uppercase">{diagnosis.impactLevel}</span>
                  </div>
                  <div className="bg-white/5 p-2.5 rounded-lg border border-white/10">
                    <span className="text-slate-400 block text-[10px]">Affected Users</span>
                    <span className="font-bold text-white">{incident.affectedUsers} Users</span>
                  </div>
                  <div className="bg-white/5 p-2.5 rounded-lg border border-white/10">
                    <span className="text-slate-400 block text-[10px]">Start Time</span>
                    <span className="font-mono text-white">13:10:21</span>
                  </div>
                  <div className="bg-white/5 p-2.5 rounded-lg border border-white/10">
                    <span className="text-slate-400 block text-[10px]">Detected By</span>
                    <span className="font-bold text-purple-400">AI Engine</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Root Cause Chain (AI Inference Vertical Timeline) */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 space-y-4 shadow-lg">
            <h3 className="font-bold text-sm text-white flex items-center gap-2 border-b border-white/10 pb-3">
              <Activity className="w-4 h-4 text-purple-400" />
              Root Cause Chain (AI Inference Propagation Timeline)
            </h3>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-red-500 before:via-amber-500 before:to-purple-500">
              {diagnosis.chain.map((step, idx) => (
                <div key={idx} className="relative flex items-start gap-4 group">
                  {/* Step Dot */}
                  <div
                    className={`absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shadow ${
                      step.severity === 'critical'
                        ? 'bg-red-500 text-white animate-pulse'
                        : step.severity === 'warning'
                        ? 'bg-amber-500 text-black'
                        : 'bg-blue-500 text-white'
                    }`}
                  >
                    {step.order}
                  </div>

                  {/* Step Box */}
                  <div className="flex-1 bg-black/20 border border-white/10 rounded-xl p-3.5 space-y-1 hover:border-white/20 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white flex items-center gap-2">
                        {step.title}
                        <span className="text-[10px] text-purple-400 font-mono">({step.entityName})</span>
                      </span>
                      <span className="text-[10px] font-mono text-slate-300 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                        {step.timestamp}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Evidence & Metrics (4 Cards) */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 space-y-4 shadow-lg">
            <h3 className="font-bold text-sm text-white flex items-center gap-2 border-b border-white/10 pb-3">
              <Database className="w-4 h-4 text-emerald-400" />
              Evidence & Metrics (หลักฐานที่ AI ใช้สรุป)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {diagnosis.evidence.map((item, idx) => (
                <div key={idx} className="bg-black/20 border border-white/10 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300 truncate">{item.metricName}</span>
                    <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                      BREACHED
                    </span>
                  </div>

                  <div>
                    <span className="text-2xl font-extrabold text-red-400 tabular-nums">
                      {item.value} {item.unit}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Threshold: {item.thresholdOperator} {item.threshold} {item.unit}
                    </span>
                  </div>

                  {/* Sparkline chart */}
                  <div className="h-16 -mx-2 -mb-2 pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={item.series}>
                        <Line type="monotone" dataKey="v" stroke="#EF4444" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Recommendation Summary linking to Action Center */}
          <div className="bg-gradient-to-r from-purple-950/40 to-blue-950/40 border border-purple-500/30 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg backdrop-blur-md">
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                AI Recommendation (แนวทางแก้ไขที่ AI เสนอ)
              </h4>
              <p className="text-xs text-slate-300">
                แนะนำให้ทำการ Live Migration ERP-VM ไปยัง ESXi-Host-02 เพื่อแก้ปัญหา Storage Latency โดยไม่มี Downtime
              </p>
            </div>

            <button
              onClick={() => onNavigateTab('action-center', 'recommendations')}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg transition-all shrink-0 flex items-center gap-2"
            >
              View Recommendations →
            </button>
          </div>
        </div>
      )}

      {/* SUBTAB 2: AI CHAT ASSISTANT */}
      {subTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[720px]">
          {/* Left Panel - Chat History (4 cols) */}
          <div className="lg:col-span-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col justify-between space-y-4 shadow-lg">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-purple-400" />
                  Chat History
                </h3>
                <button
                  onClick={() => {
                    const newId = `chat-${chatSessions.length + 1}`;
                    setActiveSessionId(newId);
                    setMessages([]);
                  }}
                  className="px-2.5 py-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> New Chat
                </button>
              </div>

              {/* Search chat */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  className="w-full bg-black/20 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-purple-500/50"
                />
              </div>

              {/* Session list */}
              <div className="space-y-2 max-h-[520px] overflow-y-auto">
                {chatSessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => setActiveSessionId(session.id)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      activeSessionId === session.id
                        ? 'bg-purple-600/20 border-purple-500/50 text-white font-medium shadow'
                        : 'bg-black/20 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold truncate text-white">{session.title}</span>
                      <span className="text-[10px] text-slate-400">{session.timestamp}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">{session.lastMessage}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 text-[10px] text-slate-400 text-center">
              AI-NOC Assistant v1.0 (Gemini 3.6 Flash)
            </div>
          </div>

          {/* Right Panel - Active Chat Window (8 cols) */}
          <div className="lg:col-span-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 flex flex-col justify-between shadow-lg relative">
            {/* Chat Messages Stream */}
            <div className="flex-1 space-y-4 overflow-y-auto pr-2 mb-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0 mt-1">
                      <Brain className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-xs space-y-2 shadow-md ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-none font-medium'
                        : 'bg-black/20 border border-white/10 text-slate-200 rounded-tl-none'
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="flex items-center justify-between border-b border-white/10 pb-1.5 text-[10px] text-slate-300">
                        <span className="font-bold text-purple-400 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-purple-400" /> AI-NOC Assistant
                        </span>
                        <span>{msg.timestamp}</span>
                      </div>
                    )}

                    <div className="whitespace-pre-wrap leading-relaxed">
                      {msg.content}
                    </div>

                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-3 pt-2 border-t border-white/10 text-slate-400">
                        <button className="hover:text-white transition-colors" title="Copy text">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button className="hover:text-emerald-400 transition-colors" title="Helpful">
                          <ThumbsUp className="w-3.5 h-3.5" />
                        </button>
                        <button className="hover:text-red-400 transition-colors" title="Not helpful">
                          <ThumbsDown className="w-3.5 h-3.5" />
                        </button>
                        <button className="hover:text-blue-400 transition-colors ml-auto" title="Share answer">
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoadingAi && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 animate-pulse">
                    <Brain className="w-4 h-4" />
                  </div>
                  <div className="bg-black/20 border border-white/10 p-3 rounded-xl text-xs text-slate-300 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500 animate-ping"></div>
                    กำลังวิเคราะห์ข้อมูลเครือข่ายด้วย Gemini 3.6 Flash...
                  </div>
                </div>
              )}
            </div>

            {/* Suggested Prompts & Query Input Bar */}
            <div className="space-y-3 pt-2 border-t border-white/10">
              {/* Suggested chips */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Suggested:</span>
                {suggestedPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    className="px-2.5 py-1 bg-black/20 hover:bg-white/10 border border-white/10 rounded-lg text-[11px] text-slate-300 hover:text-white transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {/* Input field */}
              <div className="flex items-center gap-2 relative">
                <input
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="พิมพ์คำถามเกี่ยวกับระบบเครือข่าย เช่น 'ทำไมผู้ใช้เข้า ERP ไม่ได้?'..."
                  className="w-full bg-black/20 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 shadow-inner"
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputQuery.trim() || isLoadingAi}
                  className="absolute right-2 p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-all disabled:opacity-40"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              {/* Mandatory AI Disclaimer at bottom */}
              <div className="text-[10px] text-slate-400 text-center flex items-center justify-center gap-1 font-medium">
                <Info className="w-3 h-3 text-purple-400" />
                AI อาจให้ข้อมูลไม่ 100% โปรดตรวจสอบและตัดสินใจก่อนดำเนินการ
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
