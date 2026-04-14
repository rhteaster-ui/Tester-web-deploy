import React, { useState, useEffect } from "react";
import { Terminal, Loader2, Play, AlertCircle, CheckCircle2, Copy, ExternalLink, User, ListFilter } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { toast } from "sonner";
import { db } from "@/src/lib/db";

export function VercelLogs() {
  const [deploymentId, setDeploymentId] = useState("");
  const [events, setEvents] = useState<any[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");

  useEffect(() => {
    const loadProjects = async () => {
      const all = await db.projects.toArray();
      setProjects(all);
      if (all.length > 0) {
        setSelectedProject(all[0].id);
      }
    };
    loadProjects();
  }, []);

  useEffect(() => {
    if (!selectedProject) return;
    const project = projects.find((p) => p.id === selectedProject);
    if (project?.deploymentId) {
      setDeploymentId(project.deploymentId);
      return;
    }
    if (project?.deploymentUrl) {
      setDeploymentId("");
    }
  }, [selectedProject, projects]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Berhasil disalin!");
  };

  const fetchVercelLogs = async () => {
    const token = localStorage.getItem("vercel_token");
    const normalizedId = deploymentId.trim();
    if (!token || !normalizedId) {
      toast.error("Token Vercel dan ID Deployment diperlukan");
      return;
    }
    if (!/^dpl_/i.test(normalizedId)) {
      toast.error("ID deployment harus diawali dpl_ (bukan subdomain URL).");
      return;
    }

    setIsPolling(true);
    try {
      const response = await fetch(`https://api.vercel.com/v2/deployments/${normalizedId}/events`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        const nextEvents = Array.isArray(data) ? data : (Array.isArray(data?.events) ? data.events : []);
        setEvents(nextEvents);
        if (nextEvents.length === 0) {
          toast.info("Belum ada event build untuk deployment ini.");
        }
      } else {
        const errorMsg = typeof data.error === "string" 
          ? data.error 
          : (data.error?.message || "Gagal mengambil log build");
        toast.error(errorMsg);
      }
    } catch (error: any) {
      toast.error("Kesalahan jaringan: " + error.message);
    } finally {
      setIsPolling(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-5xl mx-auto pb-24 md:pb-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
            <User className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">ID Pengguna</p>
            <p className="text-sm font-black text-white truncate max-w-[150px]">
              Tersembunyi
            </p>
          </div>
        </div>
        
        <div className="md:col-span-2 flex gap-2">
          <button 
            onClick={() => copyToClipboard(`https://${deploymentId}.vercel.app`)}
            disabled={!deploymentId}
            className="flex-1 p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center gap-2 hover:bg-white/10 transition-all text-[10px] md:text-xs font-bold disabled:opacity-50 min-h-[40px]"
          >
            <Copy className="w-4 h-4" />
            Salin Tautan
          </button>
          <button 
            onClick={() => window.open(`https://${deploymentId}.vercel.app`, "_blank")}
            disabled={!deploymentId}
            className="flex-1 p-4 rounded-2xl bg-blue-600/10 border border-blue-600/20 text-blue-400 flex items-center justify-center gap-2 hover:bg-blue-600/20 transition-all text-[10px] md:text-xs font-bold disabled:opacity-50 min-h-[40px]"
          >
            <ExternalLink className="w-4 h-4" />
            Buka Web
          </button>
        </div>
      </div>

      <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-blue-400">
            <Terminal className="w-5 h-5" />
            <h3 className="font-bold uppercase tracking-widest text-sm">Terminal Build</h3>
          </div>
          
          <div className="flex items-center gap-2">
            <ListFilter className="w-4 h-4 text-white/20" />
            <select 
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500 transition-all min-h-[32px]"
            >
              <option value="">Pilih Proyek</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <input 
            type="text"
            value={deploymentId}
            onChange={(e) => setDeploymentId(e.target.value)}
            placeholder="ID Deployment (dpl_...)"
            className="flex-1 sm:max-w-[300px] bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500 transition-all min-h-[48px]"
          />
          <button 
            onClick={fetchVercelLogs}
            disabled={isPolling}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 min-h-[48px]"
          >
            {isPolling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Stream
          </button>
        </div>
      </div>

      <div className="rounded-3xl bg-black border border-white/10 overflow-hidden shadow-2xl">
        <div className="p-4 bg-white/5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-mono text-white/30">build_output.sh</span>
          </div>
        </div>
        
        <div className="p-4 md:p-6 font-mono text-xs h-[400px] overflow-y-auto overflow-x-hidden space-y-1 custom-scrollbar bg-[#050505]">
          {events.map((event, i) => (
            <div key={i} className="flex gap-3 md:gap-4 group min-w-0">
              <span className="text-white/20 shrink-0">[{new Date(event.created).toLocaleTimeString()}]</span>
              <span className={cn(
                "flex-1 break-words min-w-0",
                event.type === "error" ? "text-red-400" : "text-white/70"
              )}>
                {event.text}
              </span>
            </div>
          ))}
          {events.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-white/10 space-y-2">
              <Terminal className="w-12 h-12" />
              <p className="italic text-center px-4">Tidak ada log build. Masukkan ID Deployment untuk mulai streaming.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
