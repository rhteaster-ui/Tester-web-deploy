import React, { useState } from "react";
import { Upload, Shield, AlertCircle, CheckCircle2, Loader2, ExternalLink, Rocket, FileCode } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/src/lib/utils";
import JSZip from "jszip";
import { db } from "@/src/lib/db";

interface DeploymentPanelProps {
  setActiveTab: (tab: string) => void;
}

export function DeploymentPanel({ setActiveTab }: DeploymentPanelProps) {
  const [token, setToken] = useState(localStorage.getItem("vercel_token") || "");
  const [projectName, setProjectName] = useState("");
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentResult, setDeploymentResult] = useState<any>(null);

  const handleSaveToken = () => {
    localStorage.setItem("vercel_token", token);
    toast.success("Token berhasil disimpan secara lokal");
  };

  const detectFramework = (files: any[]) => {
    if (!files || !Array.isArray(files)) return null;
    const pkgJson = files.find(f => f.path === "package.json" || f.path.endsWith("/package.json"));
    if (pkgJson) {
      try {
        const content = JSON.parse(atob(pkgJson.content));
        const deps = { ...content.dependencies, ...content.devDependencies };
        if (deps.next) return "nextjs";
        if (deps.vite) return "vite";
        if (deps["react-scripts"]) return "create-react-app";
        if (deps.nuxt) return "nuxtjs";
        if (deps.gatsby) return "gatsby";
      } catch (e) {
        console.error("Error parsing package.json for framework detection", e);
      }
    }
    return null; // Default to static
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    if (!projectName) {
      toast.error("Silakan masukkan nama proyek terlebih dahulu");
      return;
    }

    setIsDeploying(true);
    setDeploymentResult(null);

    try {
      const filesToInsert: any[] = [];
      const filesForDirectDeploy: any[] = [];

      for (const file of Array.from(uploadedFiles) as File[]) {
        if (file.name.endsWith(".zip")) {
          const zip = new JSZip();
          const contents = await zip.loadAsync(file as any);
          
          for (const [path, fileData] of Object.entries(contents.files)) {
            if (!fileData.dir) {
              const textContent = await fileData.async("string");
              const base64Content = await fileData.async("base64");
              
              filesToInsert.push({
                projectId: projectName,
                path,
                content: textContent,
                isFolder: false,
                updatedAt: Date.now()
              });

              filesForDirectDeploy.push({
                path,
                content: base64Content
              });
            }
          }
        } else {
          // Individual file
          const textContent = await file.text();
          const base64Content = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string).split(",")[1]);
            reader.readAsDataURL(file);
          });

          filesToInsert.push({
            projectId: projectName,
            path: file.name,
            content: textContent,
            isFolder: false,
            updatedAt: Date.now()
          });

          filesForDirectDeploy.push({
            path: file.name,
            content: base64Content
          });
        }
      }

      const detectedFramework = detectFramework(filesForDirectDeploy);
      if (detectedFramework) {
        toast.info(`Framework terdeteksi: ${detectedFramework}`);
      }

      // Save to VFS and redirect to Editor
      await db.files.where("projectId").equals(projectName).delete();
      await db.files.bulkAdd(filesToInsert);
      localStorage.setItem("current_project_id", projectName);
      localStorage.setItem(`framework_${projectName}`, detectedFramework || "");
      
      toast.success(`Berhasil mengekstrak ${filesToInsert.length} file. Mengalihkan ke Editor...`);
      setActiveTab("editor");
    } catch (error: any) {
      toast.error("Kesalahan memproses file: " + error.message);
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 md:space-y-12 max-w-5xl mx-auto pb-24 md:pb-8">
      <header className="space-y-2 text-center md:text-left">
        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter">Deployment</h1>
        <p className="text-white/40 text-sm md:text-base">Deploy proyek statis Anda langsung ke Vercel tanpa Git.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Authentication Card */}
        <div className="lg:col-span-2 p-6 md:p-10 rounded-[32px] md:rounded-[48px] bg-white/5 border border-white/10 space-y-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:scale-110 transition-transform duration-700">
            <Shield className="w-48 h-48 text-white rotate-12" />
          </div>
          
          <div className="space-y-6 relative z-10">
            <div className="flex items-center gap-3 text-blue-400">
              <Shield className="w-6 h-6" />
              <h3 className="font-black uppercase tracking-[0.2em] text-xs md:text-sm">Autentikasi Vercel</h3>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Personal Access Token</label>
                <input 
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Masukkan token Vercel Anda..."
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-blue-500 outline-none transition-all shadow-inner min-h-[56px]"
                />
                <div className="flex items-center gap-2 text-[10px] text-white/30 italic mt-2">
                  <AlertCircle className="w-3 h-3" />
                  Token disimpan secara lokal di browser Anda dan tidak pernah dikirim ke server kami.
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={handleSaveToken}
                  className="flex-1 py-4 bg-white text-black font-black rounded-2xl hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl shadow-white/5 min-h-[56px]"
                >
                  Simpan Token
                </button>
                <button 
                  onClick={() => {
                    setToken("TRIAL_MODE_ACTIVE");
                    localStorage.setItem("vercel_token", "TRIAL_MODE_ACTIVE");
                    toast.info("Mode Demo diaktifkan");
                  }}
                  className="px-8 py-4 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-black rounded-2xl transition-all border border-blue-500/20 min-h-[56px]"
                >
                  Gunakan Demo
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="p-6 md:p-8 rounded-[32px] bg-blue-600/10 border border-blue-600/20 flex flex-col justify-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h4 className="text-lg font-black text-white tracking-tight">Butuh Token?</h4>
          <p className="text-xs text-blue-400/60 leading-relaxed">
            Anda dapat membuat token akses pribadi di pengaturan akun Vercel Anda. Token ini diperlukan untuk mengautentikasi deployment Anda.
          </p>
          <a 
            href="https://vercel.com/account/tokens" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[10px] text-blue-400 font-black uppercase tracking-widest hover:underline mt-2"
          >
            Dapatkan Token <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Project Setup Card */}
        <div className="lg:col-span-3 p-6 md:p-10 rounded-[32px] md:rounded-[48px] bg-white/5 border border-white/10 space-y-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:scale-110 transition-transform duration-700">
            <Rocket className="w-64 h-64 text-white -rotate-12" />
          </div>

          <div className="space-y-8 relative z-10">
            <div className="flex items-center gap-3 text-purple-400">
              <Rocket className="w-6 h-6" />
              <h3 className="font-black uppercase tracking-[0.2em] text-xs md:text-sm">Konfigurasi Proyek</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Nama Proyek</label>
                  <input 
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="contoh: aplikasi-keren-saya"
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-purple-500 outline-none transition-all shadow-inner min-h-[56px]"
                  />
                </div>
                <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/10">
                  <p className="text-[10px] text-purple-400/60 leading-relaxed">
                    Nama proyek akan digunakan sebagai ID unik di Vercel dan database lokal Anda.
                  </p>
                </div>
              </div>
              
              <div className="relative group/upload">
                <input 
                  type="file" 
                  multiple
                  onChange={handleFileUpload}
                  disabled={isDeploying}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-20"
                />
                <div className={cn(
                  "w-full h-full min-h-[160px] border-2 border-dashed border-white/10 rounded-[32px] flex flex-col items-center justify-center gap-4 transition-all group-hover/upload:border-purple-500/50 group-hover/upload:bg-purple-500/5",
                  isDeploying && "opacity-50"
                )}>
                  {isDeploying ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
                      <span className="text-xs font-black text-purple-400 uppercase tracking-widest">Memproses...</span>
                    </div>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center group-hover/upload:scale-110 transition-transform duration-500">
                        <Upload className="w-8 h-8 text-white/20 group-hover/upload:text-purple-400 transition-colors" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-black text-white group-hover/upload:text-purple-400 transition-colors">Unggah File atau ZIP</p>
                        <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">Klik atau seret ke sini</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
