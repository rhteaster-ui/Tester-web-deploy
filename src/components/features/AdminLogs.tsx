import React, { useState, useEffect } from "react";
import { Terminal, ShieldAlert, RefreshCw, Clock, Activity, LayoutGrid, ListTree } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/src/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { VercelLogs } from "./VercelLogs";

export function AdminLogs() {
  const [subTab, setSubTab] = useState<"system" | "build">("build");
  const [logs, setLogs] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/metrics");
      const data = await response.json();
      if (response.ok) {
        setLogs(data);
      } else {
        const errorMsg = typeof data.error === "string" 
          ? data.error 
          : (data.error?.message || "Gagal mengambil log");
        toast.error(errorMsg);
      }
    } catch (error: any) {
      toast.error("Kesalahan jaringan: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-6xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold text-white">Log Sistem</h1>
          <p className="text-xs md:text-sm text-white/50">Aktivitas real-time dan metrik kesehatan sistem.</p>
        </div>
        
        <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-xl md:rounded-2xl">
          <button 
            onClick={() => setSubTab("system")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all min-h-[40px]",
              subTab === "system" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
            )}
          >
            <LayoutGrid className="w-4 h-4" />
            Sistem
          </button>
          <button 
            onClick={() => setSubTab("build")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all min-h-[40px]",
              subTab === "build" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
            )}
          >
            <Terminal className="w-4 h-4" />
            Build
          </button>
        </div>
      </header>

      {subTab === "system" ? (
        <>
          {logs && (
            <div className="space-y-6 md:space-y-8 animate-in fade-in duration-700">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                <div className="p-4 md:p-6 rounded-2xl md:rounded-3xl bg-white/5 border border-white/10">
                  <p className="text-white/40 text-[10px] md:text-xs uppercase font-mono mb-1">Total Aksi</p>
                  <p className="text-2xl md:text-3xl font-bold text-white">{logs.totalLogs}</p>
                </div>
                <div className="p-4 md:p-6 rounded-2xl md:rounded-3xl bg-green-500/10 border border-green-500/20">
                  <p className="text-green-400/60 text-[10px] md:text-xs uppercase font-mono mb-1">Tingkat Keberhasilan</p>
                  <p className="text-2xl md:text-3xl font-bold text-green-400">
                    {Math.round((logs.stats.success / logs.totalLogs) * 100) || 0}%
                  </p>
                </div>
                <div className="p-4 md:p-6 rounded-2xl md:rounded-3xl bg-red-500/10 border border-red-500/20">
                  <p className="text-red-400/60 text-[10px] md:text-xs uppercase font-mono mb-1">Jumlah Kesalahan</p>
                  <p className="text-2xl md:text-3xl font-bold text-red-400">{logs.stats.error}</p>
                </div>
              </div>

              <div className="rounded-2xl md:rounded-3xl bg-black border border-white/10 overflow-hidden shadow-2xl">
                <div className="p-3 md:p-4 bg-white/5 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-red-500/50" />
                      <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-yellow-500/50" />
                      <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-green-500/50" />
                    </div>
                    <span className="text-[10px] md:text-xs font-mono text-white/30 ml-2 md:ml-4">system_activity.log</span>
                  </div>
                  <button onClick={fetchLogs} disabled={isLoading} className="text-white/20 hover:text-white transition-colors p-2">
                    <RefreshCw className={cn("w-3.5 h-3.5 md:w-4 md:h-4", isLoading && "animate-spin")} />
                  </button>
                </div>
                
                <div className="p-3 md:p-4 font-mono text-[10px] md:text-sm h-[400px] md:h-[500px] overflow-y-auto space-y-2 custom-scrollbar">
                  {logs.recentLogs.map((log: any, i: number) => (
                    <div key={i} className="group flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-2 border-b border-white/[0.02] last:border-0">
                      <div className="flex items-center justify-between sm:justify-start gap-3 shrink-0">
                        <span className="text-white/20 w-20 sm:w-24">{formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}</span>
                        <span className={cn(
                          "px-1.5 py-0.5 rounded-[4px] text-[8px] md:text-[10px] font-bold uppercase",
                          log.status === "success" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                        )}>
                          {log.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-white/80 font-bold shrink-0">{log.action}</span>
                        <span className="text-white/40 truncate">
                          {typeof (log.projectName || log.error || log.message) === "object" 
                            ? JSON.stringify(log.projectName || log.error || log.message) 
                            : (log.projectName || log.error || log.message || "-")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <VercelLogs />
      )}
    </div>
  );
}
