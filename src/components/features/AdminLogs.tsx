import React, { useState, useEffect } from "react";
import { Terminal, RefreshCw, Activity, LayoutGrid, ListTree, Trash2, Globe } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/src/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { VercelLogs } from "./VercelLogs";
import { db } from "@/src/lib/db";

export function AdminLogs() {
  const [subTab, setSubTab] = useState<"system" | "build" | "repo" | "deployed">("build");
  const [logs, setLogs] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [healthMap, setHealthMap] = useState<Record<string, "online" | "offline" | "unknown">>({});

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
    db.projects.toArray().then(setProjects);
  }, []);

  const refreshProjects = async () => {
    const all = await db.projects.toArray();
    setProjects(all);
  };

  const checkWebsite = async (url?: string) => {
    if (!url) return "unknown";
    try {
      const response = await fetch(`https://${url}`, { method: "HEAD", mode: "no-cors" });
      return response ? "online" : "unknown";
    } catch {
      return "offline";
    }
  };

  const handleDeleteRepo = async (projectId: string) => {
    await db.files.where("projectId").equals(projectId).delete();
    await db.projects.delete(projectId);
    toast.success("Repository dihapus dari histori.");
    refreshProjects();
  };

  const handleDeleteDeployment = async (projectId: string) => {
    await db.projects.update(projectId, {
      isDeployed: false,
      deploymentUrl: undefined,
      lastDeployedAt: undefined,
      updatedAt: Date.now()
    });
    toast.success("Data deploy dihapus dari histori.");
    refreshProjects();
  };

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
          <button 
            onClick={() => setSubTab("repo")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all min-h-[40px]",
              subTab === "repo" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
            )}
          >
            <ListTree className="w-4 h-4" />
            Repo
          </button>
          <button 
            onClick={() => setSubTab("deployed")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all min-h-[40px]",
              subTab === "deployed" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
            )}
          >
            <Activity className="w-4 h-4" />
            Deployed
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
              {logs.limited && (
                <div className="p-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 text-yellow-300 text-xs">
                  Mode publik aktif: detail recent logs disembunyikan. Tambahkan header Authorization Bearer admin secret untuk mode penuh.
                </div>
              )}

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
      ) : subTab === "build" ? (
        <VercelLogs />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects
            .filter((p) => (subTab === "deployed" ? p.isDeployed : !p.isDeployed))
            .map((p) => (
              <div key={p.id} className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <p className="font-bold text-white">{p.name}</p>
                <p className="text-xs text-white/40">{p.isDeployed ? "Sudah deploy" : "Tersimpan di repository"}</p>
                {p.deploymentUrl && <p className="text-xs text-green-400">{p.deploymentUrl}</p>}
                {p.deploymentUrl && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        const status = await checkWebsite(p.deploymentUrl);
                        setHealthMap(prev => ({ ...prev, [p.id]: status }));
                      }}
                      className="px-3 py-2 rounded-xl text-xs bg-white/5 border border-white/10 text-white/70 flex items-center gap-1"
                    >
                      <Globe className="w-3.5 h-3.5" /> Cek Status
                    </button>
                    {healthMap[p.id] && (
                      <span className={cn("text-xs", healthMap[p.id] === "online" ? "text-green-400" : healthMap[p.id] === "offline" ? "text-red-400" : "text-yellow-400")}>
                        {healthMap[p.id]}
                      </span>
                    )}
                  </div>
                )}
                <button
                  onClick={() => (subTab === "deployed" ? handleDeleteDeployment(p.id) : handleDeleteRepo(p.id))}
                  className="px-3 py-2 rounded-xl text-xs bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {subTab === "deployed" ? "Hapus Deploy" : "Hapus Repo"}
                </button>
              </div>
            ))}
          {projects.filter((p) => (subTab === "deployed" ? p.isDeployed : !p.isDeployed)).length === 0 && (
            <div className="p-10 rounded-3xl border border-dashed border-white/10 text-center text-white/40">
              Tidak ada data.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
