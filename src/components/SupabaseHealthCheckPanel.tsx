import React, { useEffect, useState } from 'react';
import { Database, CheckCircle, AlertTriangle, XCircle, RefreshCw, Server, HardDrive, Table, ShieldAlert } from 'lucide-react';
import { runSupabaseHealthCheck, HealthCheckResult, TableStatus, BucketStatus } from '../services/healthCheck';

export const SupabaseHealthCheckPanel: React.FC = () => {
  const [health, setHealth] = useState<HealthCheckResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [collapsed, setCollapsed] = useState<boolean>(false);

  const performCheck = async () => {
    setLoading(true);
    try {
      const res = await runSupabaseHealthCheck();
      setHealth(res);
      // Auto collapse if all healthy, expand if any issues
      if (res.allHealthy) {
        setCollapsed(true);
      } else {
        setCollapsed(false);
      }
    } catch (err) {
      console.error('Health check failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    performCheck();
  }, []);

  if (loading && !health) {
    return (
      <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
          <span>Running Supabase Architecture Diagnostic...</span>
        </div>
      </div>
    );
  }

  if (!health) return null;

  return (
    <div className={`bg-zinc-950 border ${health.allHealthy ? 'border-zinc-800' : 'border-amber-500/40 bg-amber-500/5'} rounded-2xl p-4 space-y-3 transition`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-xl ${health.allHealthy ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
            <Server className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black text-white flex items-center gap-2">
              Supabase Architecture Health Check
              {health.allHealthy ? (
                <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> ALL SYSTEMS OPERATIONAL
                </span>
              ) : (
                <span className="bg-amber-500/20 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> ISSUES DETECTED
                </span>
              )}
            </h3>
            <p className="text-[10px] text-zinc-400">
              Single Source of Truth Check — {new Date(health.timestamp).toLocaleTimeString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={performCheck}
            disabled={loading}
            className="p-1.5 text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-xl transition text-xs flex items-center gap-1 font-semibold"
            title="Re-run Diagnostics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="text-xs font-bold text-zinc-400 hover:text-white px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl"
          >
            {collapsed ? 'View Details' : 'Hide'}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="space-y-3 pt-2 border-t border-zinc-800/80 text-xs">
          {/* Database Tables Section */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
              <Table className="w-3.5 h-3.5 text-amber-400" /> PostgreSQL Database Tables
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.entries(health.tables) as [string, TableStatus][]).map(([tableName, status]) => (
                <div 
                  key={tableName} 
                  className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                    status.status === 'OK' 
                      ? 'bg-zinc-900/60 border-zinc-800/80' 
                      : 'bg-red-500/10 border-red-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-zinc-200 text-[11px]">public.{tableName}</span>
                    {status.status === 'OK' ? (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    )}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px]">
                    <span className={status.status === 'OK' ? 'text-emerald-400 font-semibold' : 'text-red-300 font-bold'}>
                      {status.status === 'OK' ? 'Connected' : 'MISSING TABLE'}
                    </span>
                    {status.count !== undefined && (
                      <span className="text-zinc-500 font-mono">{status.count} records</span>
                    )}
                  </div>
                  {status.message && (
                    <p className="text-[10px] text-red-300 mt-1 leading-tight font-sans bg-red-950/50 p-1.5 rounded border border-red-500/20">
                      {status.message}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Storage Buckets Section */}
          <div className="space-y-1.5 pt-2">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5 text-amber-400" /> Supabase Storage Buckets
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(Object.entries(health.buckets) as [string, BucketStatus][]).map(([key, status]) => (
                <div 
                  key={key} 
                  className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                    status.status === 'OK' 
                      ? 'bg-zinc-900/60 border-zinc-800/80' 
                      : 'bg-red-500/10 border-red-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-zinc-200 text-[11px]">{status.name}</span>
                    {status.status === 'OK' ? (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    )}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px]">
                    <span className={status.status === 'OK' ? 'text-emerald-400 font-semibold' : 'text-red-300 font-bold'}>
                      {status.status === 'OK' ? 'Accessible' : status.status}
                    </span>
                  </div>
                  {status.message && (
                    <p className="text-[10px] text-red-300 mt-1 leading-tight font-sans bg-red-950/50 p-1.5 rounded border border-red-500/20">
                      {status.message}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {!health.allHealthy && (
            <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl flex items-start gap-2 text-amber-200 text-[11px] mt-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white mb-0.5">How to fix missing tables or buckets:</p>
                <p>
                  1. Open your Supabase Dashboard &rarr; SQL Editor &rarr; Run <code className="bg-zinc-900 px-1 py-0.5 rounded text-amber-300">/supabase/schema.sql</code>
                  <br />
                  2. Open Supabase Dashboard &rarr; Storage &rarr; Create public buckets: <code className="bg-zinc-900 px-1 py-0.5 rounded text-amber-300">apk-files</code>, <code className="bg-zinc-900 px-1 py-0.5 rounded text-amber-300">app-images</code>, <code className="bg-zinc-900 px-1 py-0.5 rounded text-amber-300">screenshots</code>.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
