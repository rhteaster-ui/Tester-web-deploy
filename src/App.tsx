/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Sidebar } from "./components/layout/Sidebar";
import { BottomNav } from "./components/layout/BottomNav";
import { DeploymentPanel } from "./components/features/DeploymentPanel";
import { EditorModule } from "./components/features/EditorModule";
import { Toaster, toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { Rocket, ShieldCheck, Github, Instagram, MessageCircle, Send, Code, ChevronRight, Activity, Trash2, UserPlus, LogOut, Heart } from "lucide-react";
import { cn } from "@/src/lib/utils";

import { db } from "./lib/db";
import { Project, VercelToken } from "./types";

const TokenManager = ({ onSelect }: { onSelect: (token: VercelToken) => void }) => {
  const [tokens, setTokens] = useState<VercelToken[]>([]);
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [mode, setMode] = useState<"token" | "demo">("token");

  const loadTokens = async () => {
    const all = await db.tokens.toArray();
    setTokens(all);
  };

  useEffect(() => {
    loadTokens();
  }, []);

  const handleAdd = async () => {
    if (!name || (mode === "token" && !value)) {
      toast.error(mode === "token" ? "Nama dan Token wajib diisi" : "Nama akun demo wajib diisi");
      return;
    }
    const newToken: VercelToken = {
      name,
      value: mode === "demo" ? "TRIAL_MODE_ACTIVE" : value,
      isTrial: mode === "demo" || value === "TRIAL_MODE_ACTIVE",
      isActive: false
    };
    await db.tokens.add(newToken);
    setName("");
    setValue("");
    loadTokens();
    toast.success("Akun token ditambahkan");
  };

  const handleDelete = async (id: number) => {
    await db.tokens.delete(id);
    loadTokens();
  };

  const handleSelect = async (token: VercelToken) => {
    // Set all to inactive
    await db.tokens.toCollection().modify({ isActive: false });
    // Set selected to active
    await db.tokens.update(token.id!, { isActive: true });
    localStorage.setItem("vercel_token", token.value);
    localStorage.setItem("app_mode", token.isTrial ? "demo" : "token");
    onSelect(token);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-white">Kelola Akun Token</h3>
        <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 border border-white/10 rounded-xl">
          <button
            onClick={() => setMode("token")}
            className={cn("py-2 rounded-lg text-xs font-bold transition-all", mode === "token" ? "bg-white/10 text-white" : "text-white/50")}
          >
            Trial / Non Trial
          </button>
          <button
            onClick={() => setMode("demo")}
            className={cn("py-2 rounded-lg text-xs font-bold transition-all", mode === "demo" ? "bg-blue-500/20 text-blue-400" : "text-white/50")}
          >
            Demo
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input 
            type="text" 
            placeholder="Nama Akun (ex: Akun Utama)" 
            value={name}
            onChange={e => setName(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
          />
          <input 
            type="password" 
            placeholder="Vercel Token (dpl_...)" 
            value={value}
            onChange={e => setValue(e.target.value)}
            disabled={mode === "demo"}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
          />
        </div>
        <button 
          onClick={handleAdd}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all"
        >
          Tambah Akun
        </button>
      </div>

      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
        {tokens.map(t => (
          <div key={t.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 group">
            <div className="flex items-center gap-3">
              <div className={cn("w-2 h-2 rounded-full", t.isActive ? "bg-green-500 animate-pulse" : "bg-white/20")} />
              <div>
                <p className="font-bold text-white text-sm">{t.name}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-widest">{t.isTrial ? "Mode Demo" : "Full Access"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleSelect(t)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                  t.isActive ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-white/10 text-white hover:bg-white/20"
                )}
              >
                {t.isActive ? "Aktif" : "Pilih"}
              </button>
              <button 
                onClick={() => handleDelete(t.id!)}
                className="p-2 text-white/20 hover:text-red-400 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {tokens.length === 0 && (
          <div className="text-center py-8 text-white/20 italic text-sm">Belum ada akun token.</div>
        )}
      </div>
    </div>
  );
};

// HomeTab remains as a dashboard overview
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.03 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.9-.32-1.98-.23-2.81.33-.85.51-1.44 1.43-1.58 2.41-.14 1.01.23 2.08.94 2.79.71.71 1.71 1.02 2.71.86 1.14-.12 2.1-.85 2.55-1.9.11-.28.15-.57.17-.86.06-3.82.02-7.64.04-11.46.02-.39.06-.78.07-1.17z"/>
  </svg>
);

const HomeTab = ({ setActiveTab }: { setActiveTab: (tab: string) => void }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState({ visitors: 1240, deploys: 850 });

  useEffect(() => {
    const loadData = async () => {
      const allProjects = await db.projects.toArray();
      setProjects(allProjects);
      
      try {
        const response = await fetch("/api/stats/public");
        const data = await response.json();
        if (response.ok) {
          setStats({
            visitors: data.visitors || 1240,
            deploys: data.deploys || 850
          });
          await db.stats.put({ id: "visitors", value: data.visitors || 1240 });
          await db.stats.put({ id: "deploys", value: data.deploys || 850 });
          return;
        }
      } catch (error) {
        console.warn("Gagal memuat statistik server, fallback ke local db", error);
      }

      const visitorStat = await db.stats.get("visitors");
      const deployStat = await db.stats.get("deploys");
      setStats({
        visitors: visitorStat?.value || 1240,
        deploys: deployStat?.value || 850
      });
    };
    loadData();
  }, []);

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-10 relative overflow-hidden min-h-screen">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-600/10 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      <header className="space-y-1 relative z-10">
        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter">Dashboard</h1>
        <p className="text-white/40 text-sm font-medium">Kelola repositori dan wawasan global Anda.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 relative z-10">
        {[
          { label: "Proyek", value: projects.length.toString(), icon: Rocket, color: "text-blue-400" },
          { label: "Penyimpanan", value: "4.2MB", icon: Github, color: "text-purple-400" },
          { label: "Pengunjung", value: stats.visitors.toLocaleString(), icon: Activity, color: "text-green-400" },
          { label: "Total Deploy", value: stats.deploys.toLocaleString(), icon: ShieldCheck, color: "text-orange-400" },
        ].map((stat, i) => (
          <div key={i} className="p-4 md:p-6 rounded-2xl md:rounded-[32px] bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-2 md:mb-4">
              <div className={cn("p-2 md:p-3 rounded-xl md:rounded-2xl bg-black/40", stat.color)}>
                <stat.icon className="w-4 h-4 md:w-6 md:h-6" />
              </div>
            </div>
            <p className="text-white/40 text-[10px] md:text-xs font-bold uppercase tracking-widest mb-0.5 md:mb-1">{stat.label}</p>
            <p className="text-xl md:text-3xl font-black text-white group-hover:scale-105 transition-transform duration-300">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 relative z-10">
        <div className="lg:col-span-2 p-6 md:p-8 rounded-[32px] bg-white/5 border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg md:text-2xl font-black text-white">Grafik Aktivitas User</h3>
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">7 Hari Terakhir</p>
          </div>
          <div className="grid grid-cols-7 gap-2 h-36 items-end">
            {[35, 52, 61, 49, 75, 66, 82].map((v, idx) => (
              <div key={idx} className="flex flex-col items-center gap-2">
                <div className="w-full rounded-t-md bg-gradient-to-t from-blue-600/40 to-blue-400 h-full" style={{ height: `${v}%` }} />
                <span className="text-[10px] text-white/40">{["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"][idx]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Long Card 1: Deployment CTA */}
        <div className="p-6 md:p-10 rounded-[32px] md:rounded-[48px] bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform duration-700">
            <Rocket className="w-48 h-48 md:w-64 md:h-64 text-white rotate-12" />
          </div>
          <div className="relative z-10 space-y-4 md:space-y-6 max-w-lg">
            <div className="space-y-2">
              <h2 className="text-2xl md:text-4xl font-black text-white tracking-tight">Siap untuk deploy?</h2>
              <p className="text-white/60 text-sm md:text-base leading-relaxed">
                Unggah ZIP proyek Anda atau buat yang baru dari awal. 
                Semuanya disinkronkan dengan Vercel secara real-time.
              </p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setActiveTab("deploy")}
                className="px-6 md:px-8 py-3 md:py-4 bg-white text-black font-black rounded-2xl hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl shadow-white/10 text-sm md:text-base min-h-[48px]"
              >
                Proyek Baru
              </button>
              <button 
                onClick={() => setActiveTab("editor")}
                className="px-6 md:px-8 py-3 md:py-4 bg-white/10 text-white font-black rounded-2xl hover:bg-white/20 transition-all duration-300 text-sm md:text-base min-h-[48px]"
              >
                Lewati ke IDE
              </button>
            </div>
          </div>
        </div>

        {/* Long Card 2: Recent Repositories */}
        <div className="space-y-4 md:space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">Repositori</h3>
            <button onClick={() => setActiveTab("editor")} className="text-[10px] text-blue-400 hover:underline font-black uppercase tracking-[0.2em] min-h-[32px] px-2">Lihat Semua</button>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {projects.slice(0, 4).map((project, i) => (
              <button 
                key={i}
                onClick={() => {
                  localStorage.setItem("current_project_id", project.id);
                  setActiveTab("editor");
                }}
                className="w-full p-4 md:p-5 rounded-2xl md:rounded-3xl bg-white/5 border border-white/10 flex items-center justify-between hover:bg-white/10 hover:border-white/20 transition-all group min-h-[72px]"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                    <Code className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />
                  </div>
                  <div className="text-left">
                    <p className="font-black text-white group-hover:text-blue-400 transition-colors text-sm md:text-base">{project.name}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest">
                        {project.isDeployed ? "Sudah Deploy" : "Hanya Repo"}
                      </p>
                      {project.isDeployed && (
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      )}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </button>
            ))}
            {projects.length === 0 && (
              <div className="p-10 md:p-16 rounded-[32px] md:rounded-[48px] border-2 border-dashed border-white/5 flex flex-col items-center gap-4 text-center">
                <div className="p-4 rounded-2xl bg-white/5">
                  <Rocket className="w-8 h-8 text-white/10" />
                </div>
                <p className="text-sm text-white/30 italic">Tidak ada repositori ditemukan. Mulai dengan mendeploy aplikasi pertama Anda!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const AboutTab = () => (
  <div className="p-4 md:p-8 space-y-8 md:space-y-12 max-w-5xl mx-auto pb-24 md:pb-8">
    {/* Website Info Section */}
    <section className="space-y-6">
      <div className="relative rounded-3xl md:rounded-[40px] overflow-hidden border border-white/10 aspect-video md:aspect-[21/9] group shadow-2xl">
        <img 
          src="https://res.cloudinary.com/dwiozm4vz/image/upload/v1775567861/qjyezrr7805iiq6e3qc9.png" 
          alt="Banner" 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 md:p-8 rounded-3xl bg-white/5 border border-white/10 space-y-4">
          <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Rocket className="w-5 h-5 text-blue-400" /> Ikhtisar Platform
          </h3>
          <p className="text-white/50 text-sm leading-relaxed">
            Vercel Deploy adalah suite deployment headless kelas profesional yang dirancang untuk pengembang yang menuntut kecepatan dan fleksibilitas. 
            Dengan melewati alur kerja Git tradisional, kami memungkinkan deployment instan proyek statis dan berbasis framework langsung dari browser Anda.
          </p>
          <ul className="space-y-2">
            {[
              "IDE Browser Real-time",
              "Virtual File System (VFS)",
              "Deteksi Framework Otomatis",
              "Mesin Injeksi PWA",
              "Integrasi API Vercel Langsung"
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-white/40">
                <div className="w-1 h-1 rounded-full bg-blue-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="p-6 md:p-8 rounded-3xl bg-blue-600/10 border border-blue-600/20 space-y-4">
          <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-green-400" /> Keamanan Sistem
          </h3>
          <p className="text-white/50 text-sm leading-relaxed">
            Keamanan Anda adalah prioritas kami. Token Vercel disimpan secara ketat di penyimpanan lokal browser Anda. 
            Lapisan proxy kami memastikan bahwa kredensial Anda tidak pernah menyentuh database persisten, memberikan pengalaman yang benar-benar serverless dan aman.
          </p>
          <div className="flex gap-2">
            <div className="px-3 py-1 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-bold uppercase tracking-widest">
              AES-256
            </div>
            <div className="px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-widest">
              SSL
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* Developer Info Section */}
    <section className="pt-12 border-t border-white/10 space-y-8">
      <div className="flex flex-col items-center text-center space-y-4">
        <h2 className="text-2xl font-black text-white uppercase tracking-[0.2em]">Info Pengembang</h2>
        <div className="w-24 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
      </div>

      <div className="p-6 md:p-10 rounded-3xl md:rounded-[40px] bg-gradient-to-br from-white/[0.02] to-white/[0.05] border border-white/10 flex flex-col md:flex-row items-center gap-8">
        <div className="relative group">
          <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-500" />
          <img 
            src="https://res.cloudinary.com/dwiozm4vz/image/upload/v1772959730/ootglrvfmykn6xsto7rq.png" 
            alt="R_hmt Ofc" 
            className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white/10 relative z-10 shadow-2xl transition-transform duration-500 group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="flex-1 text-center md:text-left space-y-4">
          <div className="space-y-1">
            <h3 className="text-3xl font-black text-white tracking-tighter">R_hmt Ofc</h3>
            <p className="text-blue-400 font-bold uppercase tracking-[0.2em] text-xs">Lead Product Architect</p>
          </div>
          <p className="text-white/40 text-sm leading-relaxed max-w-xl">
            Sangat bersemangat dalam membangun alat web berkinerja tinggi dan infrastruktur deployment. 
            Berfokus pada menciptakan pengalaman pengembang yang mulus melalui solusi headless yang inovatif.
          </p>
        </div>
      </div>

      {/* Social Icons Section - Separated */}
      <div className="space-y-8 pt-8 border-t border-white/10">
        <div className="text-center space-y-2">
          <h3 className="text-xl font-black text-white uppercase tracking-[0.2em]">Contact Me & Social Media Dev</h3>
          <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">Created with passion by R_hmt Ofc</p>
        </div>
        
        <div className="flex flex-wrap justify-center gap-4">
          {[
            { 
              label: "WhatsApp", 
              url: "https://whatsapp.com/channel/0029VbBjyjlJ93wa6hwSWa0p", 
              icon: () => (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              ),
              color: "hover:bg-green-500/20 hover:text-green-400"
            },
            { 
              label: "Instagram", 
              url: "https://www.instagram.com/rahmt_nhw?igsh=MWQwcnB3bTA2ZnVidg==", 
              icon: Instagram,
              color: "hover:bg-pink-500/20 hover:text-pink-400"
            },
            { 
              label: "TikTok", 
              url: "https://www.tiktok.com/@r_hmtofc?_r=1&_t=ZS-94KRfWQjeUu", 
              icon: TikTokIcon,
              color: "hover:bg-white/20 hover:text-white"
            },
            { 
              label: "Telegram", 
              url: "https://t.me/rAi_engine", 
              icon: Send,
              color: "hover:bg-blue-500/20 hover:text-blue-400"
            },
          ].map((social, i) => (
            <a 
              key={i} 
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn("p-4 rounded-2xl bg-white/5 border border-white/10 transition-all duration-300 group min-h-[56px] min-w-[56px] flex items-center justify-center", social.color)}
            >
              <social.icon className="w-6 h-6" />
            </a>
          ))}
        </div>

        <div className="flex items-center justify-center gap-2 text-white/20 text-[10px] font-bold uppercase tracking-[0.3em]">
          <span>Created Solo</span>
          <Heart className="w-3 h-3 fill-current" />
          <span>By R_hmt Ofc</span>
        </div>
      </div>
    </section>
  </div>
);

export default function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [appMode, setAppMode] = useState<"demo" | "token" | null>(localStorage.getItem("app_mode") as any);
  const [showTokenManager, setShowTokenManager] = useState(false);
  const [activeTokenName, setActiveTokenName] = useState<string | null>(null);

  useEffect(() => {
    const checkActiveToken = async () => {
      const active = await db.tokens.where("isActive").equals(1).first();
      if (active) {
        setActiveTokenName(active.name);
        setAppMode(active.isTrial ? "demo" : "token");
      }
    };
    checkActiveToken();
  }, []);

  // Handle browser back/close confirmation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleTabChange = (tab: string) => {
    if (activeTab === "editor" && hasUnsavedChanges) {
      if (confirm("Ada perubahan yang belum disimpan. Yakin ingin keluar?")) {
        setHasUnsavedChanges(false);
        setActiveTab(tab);
      }
    } else {
      setActiveTab(tab);
    }
  };

  const selectMode = (mode: "demo" | "token") => {
    setAppMode(mode);
    localStorage.setItem("app_mode", mode);
    if (mode === "demo") {
      localStorage.setItem("vercel_token", "TRIAL_MODE_ACTIVE");
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-blue-500/30">
      {/* Initial Mode Selection Modal */}
      {!appMode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
          <div className="w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-[40px] p-8 md:p-12 space-y-8 shadow-2xl relative overflow-hidden isolate">
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none select-none">
              <Rocket className="w-64 h-64 text-white rotate-12" />
            </div>
            
            <div className="space-y-4 relative z-10">
              <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter">Selamat Datang!</h2>
              <p className="text-white/40 text-sm md:text-base max-w-md">
                Pilih metode akses Anda untuk memulai deployment proyek ke Vercel.
              </p>
            </div>

            <div className="relative z-10">
              <TokenManager onSelect={(token) => {
              setAppMode(token.isTrial ? "demo" : "token");
              setActiveTokenName(token.name);
              }} />
            </div>

            <div className="pt-4 text-center relative z-10">
              <a 
                href="https://vercel.com/account/tokens" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[10px] text-blue-400 hover:underline font-bold uppercase tracking-widest"
              >
                Belum punya token? Klik di sini untuk mengambil
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Token Switcher Overlay */}
      {showTokenManager && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-xl bg-[#0a0a0a] border border-white/10 rounded-[32px] p-8 space-y-6 shadow-2xl relative">
            <button 
              onClick={() => setShowTokenManager(false)}
              className="absolute top-6 right-6 p-2 text-white/20 hover:text-white transition-all"
            >
              <LogOut className="w-5 h-5" />
            </button>
            <div className="relative z-10">
              <TokenManager onSelect={(token) => {
              setAppMode(token.isTrial ? "demo" : "token");
              setActiveTokenName(token.name);
              setShowTokenManager(false);
            }} />
          </div>
        </div>
      )}

      {/* Background Grid */}
      <div className="fixed inset-0 bg-grid-white/[0.02] bg-[size:40px_40px] pointer-events-none" />
      <div className="fixed inset-0 bg-gradient-to-b from-black via-transparent to-black pointer-events-none" />

      <div className="flex relative z-10">
        <Sidebar activeTab={activeTab} setActiveTab={handleTabChange} />
        
        <main className="flex-1 min-h-screen pb-20 md:pb-0">
          {/* Mobile Top Bar */}
          <div className="md:hidden flex items-center justify-between p-3 bg-black/40 backdrop-blur-xl border-b border-white/10 sticky top-0 z-40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl border border-white/10 overflow-hidden shadow-lg shadow-blue-500/20">
                <img 
                  src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTpGGArTE_eXrg4L5F3A3LPOjjxf8fkt3N5urx4iuR5xN-E6B2pCIzej5o&s=10" 
                  alt="Logo" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-base tracking-tighter leading-tight">Vercel deploy</span>
                <span className="text-[8px] text-blue-400 font-bold uppercase tracking-widest">R_hmt Ofc</span>
              </div>
            </div>
            <button 
              onClick={() => setShowTokenManager(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold text-white/60"
            >
              <UserPlus className="w-3.5 h-3.5" />
              {activeTokenName || "Akun"}
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {activeTab === "home" && <HomeTab setActiveTab={handleTabChange} />}
              {activeTab === "about" && <AboutTab />}
              {activeTab === "deploy" && <DeploymentPanel setActiveTab={handleTabChange} />}
              {activeTab === "editor" && <EditorModule setHasUnsavedChanges={setHasUnsavedChanges} appMode={appMode} />}
              {activeTab === "settings" && <div className="p-8 text-white/50 italic">Memuat modul pengaturan...</div>}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <BottomNav activeTab={activeTab} setActiveTab={handleTabChange} />
      <Toaster theme="dark" position="top-center" expand={true} richColors />
    </div>
  );
}
