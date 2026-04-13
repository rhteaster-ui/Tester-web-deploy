import React, { useState, useEffect } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { css } from "@codemirror/lang-css";
import { Folder, Save, Trash2, ChevronRight, ChevronDown, FileCode, Rocket, Loader2, Code, Download, Eye, EyeOff, Maximize2, AlertCircle, MoreVertical, Upload, FilePlus, Globe, ArrowLeft, ShieldCheck, FolderGit2 } from "lucide-react";
import { db, type ProjectFile } from "@/src/lib/db";
import { cn } from "@/src/lib/utils";
import { toast } from "sonner";
import { saveAs } from "file-saver";
import JSZip from "jszip";

interface EditorModuleProps {
  setHasUnsavedChanges?: (val: boolean) => void;
  appMode?: "demo" | "token" | null;
}

export function EditorModule({ setHasUnsavedChanges, appMode }: EditorModuleProps) {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [activeFile, setActiveFile] = useState<ProjectFile | null>(null);
  const [code, setCode] = useState("");
  const [projectName, setProjectName] = useState(localStorage.getItem("current_project_id") || "default-project");
  const [projectTabs, setProjectTabs] = useState<string[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [framework, setFramework] = useState<string | null>(localStorage.getItem(`framework_${projectName}`) || "auto");
  const [showDeployConfig, setShowDeployConfig] = useState(false);
  const [isPwaEnabled, setIsPwaEnabled] = useState(true);
  const [deployedUrl, setDeployedUrl] = useState<string | null>(localStorage.getItem(`deployed_url_${projectName}`) || null);
  const [showRenameModal, setShowRenameModal] = useState<{ type: "file" | "folder" | "project", oldPath: string } | null>(null);
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newFilePath, setNewFilePath] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["root"]));

  useEffect(() => {
    // Reset blocking states on mount
    setIsDeploying(false);
    setIsExtracting(false);
  }, []);
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<"menu" | "editor">("menu");
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [repositories, setRepositories] = useState<any[]>([]);
  const [domainName, setDomainName] = useState("");
  const [confirmState, setConfirmState] = useState<{ title: string; description: string; onConfirm: () => void } | null>(null);

  const toBase64 = (value: string) => {
    const bytes = new TextEncoder().encode(value);
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
  };

  const detectFrameworkFromFiles = (projectFiles: ProjectFile[]) => {
    const pkgFile = projectFiles.find((f) => !f.isFolder && /(^|\/)package\.json$/i.test(f.path));
    if (!pkgFile) return null;
    try {
      const parsed = JSON.parse(pkgFile.content);
      const deps = { ...(parsed.dependencies || {}), ...(parsed.devDependencies || {}) };
      if (deps.next) return "nextjs";
      if (deps.vite) return "vite";
      if (deps["react-scripts"]) return "create-react-app";
      if (deps.nuxt) return "nuxtjs";
      if (deps.gatsby) return "gatsby";
    } catch (error) {
      console.warn("Gagal auto detect framework:", error);
    }
    return null;
  };

  const isTrialMode = localStorage.getItem("vercel_token") === "TRIAL_MODE_ACTIVE";
  const hasUserToken = !!localStorage.getItem("vercel_token") && !isTrialMode;
  const isDemo = appMode === "demo";

  const frameworks = [
    { id: "auto", name: "Auto Detect" },
    { id: null, name: "Other (Static)" },
    { id: "nextjs", name: "Next.js" },
    { id: "vite", name: "Vite" },
    { id: "create-react-app", name: "Create React App" },
    { id: "nuxtjs", name: "Nuxt.js" },
    { id: "gatsby", name: "Gatsby" },
  ];

  const loadFiles = async () => {
    const allFiles = await db.files.where("projectId").equals(projectName).toArray();
    setFiles(allFiles);
  };
  const loadRepositories = async () => {
    const allProjects = await db.projects.toArray();
    setRepositories(allProjects.sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt)));
  };

  useEffect(() => {
    loadFiles();
    loadRepositories();
    setFramework(localStorage.getItem(`framework_${projectName}`) || "auto");
    setDeployedUrl(localStorage.getItem(`deployed_url_${projectName}`) || null);
  }, [projectName]);

  useEffect(() => {
    if (projectName && projectName !== "default-project") {
      setProjectTabs(prev => (prev.includes(projectName) ? prev : [...prev, projectName]));
    }
  }, [projectName]);

  useEffect(() => {
    if (showPreview) {
      updatePreview();
    }
  }, [files, showPreview]);

  useEffect(() => {
    if (setHasUnsavedChanges) {
      setHasUnsavedChanges(code !== activeFile?.content);
    }
  }, [code, activeFile, setHasUnsavedChanges]);

  const updatePreview = async () => {
    if (!files || !Array.isArray(files)) return;
    const indexFile = files.find(f => f.path === "index.html" || f.path.endsWith("/index.html"));
    if (indexFile) {
      // Create a blob for the HTML and all other files to simulate a local server
      // For simplicity, we'll just show the index.html content for now
      // A more robust solution would involve a service worker or mapping all files to blob URLs
      const blob = new Blob([indexFile.content], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  // Update projectName if it changes in localStorage (e.g. after upload)
  useEffect(() => {
    const handleStorage = () => {
      const id = localStorage.getItem("current_project_id");
      if (id) setProjectName(id);
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const handleCreateFile = async (name: string) => {
    if (isDemo || !hasUserToken) {
      toast.error("Mode Demo: Anda tidak dapat membuat file secara manual.");
      return;
    }
    if (!name) return;
    if (!files || !Array.isArray(files)) return;

    // Handle nested paths
    const parts = name.split("/");
    let currentPath = "";
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const fullPath = currentPath ? `${currentPath}/${part}` : part;
      
      const exists = files.find(f => f.path === fullPath);
      if (!exists) {
        const newFile: ProjectFile = {
          projectId: projectName,
          path: fullPath,
          content: isLast ? "" : "FOLDER_MARKER",
          isFolder: !isLast,
          updatedAt: Date.now(),
        };
        await db.files.add(newFile);
      }
      currentPath = fullPath;
    }
    
    loadFiles();
    toast.success(`Berhasil dibuat: ${name}`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles) return;
    const targetProject = projectName === "default-project" ? `repo-${Date.now()}` : projectName;
    if (projectName === "default-project") {
      setProjectName(targetProject);
      setProjectTabs(prev => (prev.includes(targetProject) ? prev : [...prev, targetProject]));
    }

    setIsExtracting(true);
    const filesToInsert: ProjectFile[] = [];
    
    try {
      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        
        if (file.name.endsWith(".zip")) {
          const zip = new JSZip();
          const zipContent = await zip.loadAsync(file);
          
          for (const [path, zipEntry] of Object.entries(zipContent.files)) {
            if (!zipEntry.dir) {
              const content = await zipEntry.async("text");
              filesToInsert.push({
                projectId: targetProject,
                path,
                content,
                isFolder: false,
                updatedAt: Date.now(),
              });
            } else {
              filesToInsert.push({
                projectId: targetProject,
                path: path.endsWith("/") ? path.slice(0, -1) : path,
                content: "FOLDER_MARKER",
                isFolder: true,
                updatedAt: Date.now(),
              });
            }
          }
        } else {
          const content = await file.text();
          filesToInsert.push({
            projectId: targetProject,
            path: file.name,
            content,
            isFolder: false,
            updatedAt: Date.now(),
          });
        }
      }

      if (filesToInsert.length > 0) {
        await db.projects.put({
          id: targetProject,
          name: targetProject,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          source: "import",
          temporary: false
        });
        await db.files.bulkAdd(filesToInsert);
        loadFiles();
        loadRepositories();
        toast.success(`Berhasil mengunggah ${filesToInsert.length} file`);
      }
    } catch (error: any) {
      toast.error("Gagal mengunggah: " + error.message);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSave = async () => {
    if (isDemo || !hasUserToken) {
      toast.error("Mode Demo: Anda tidak dapat menyimpan perubahan.");
      return;
    }
    if (!activeFile) return;
    await db.files.update(activeFile.id!, { content: code, updatedAt: Date.now() });
    await db.projects.put({
      id: projectName,
      name: projectName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isDeployed: !!deployedUrl,
      deploymentUrl: deployedUrl || undefined,
      source: "manual",
      temporary: projectName.startsWith("temp-")
    });
    toast.success("File disimpan ke VFS");
    loadFiles();
    loadRepositories();
  };

  const selectFile = (file: ProjectFile) => {
    setActiveFile(file);
    setCode(file.content);
  };

  const getLanguage = (path: string) => {
    if (path.endsWith(".html")) return [html()];
    if (path.endsWith(".js") || path.endsWith(".ts")) return [javascript()];
    if (path.endsWith(".css")) return [css()];
    return [];
  };

  const handleDownloadZip = async () => {
    setIsExporting(true);
    try {
      const zip = new JSZip();
      const allFiles = await db.files.where("projectId").equals(projectName).toArray();
      
      allFiles.forEach(file => {
        if (!file.isFolder) {
          zip.file(file.path, file.content);
        }
      });

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${projectName}.zip`);
      toast.success("Proyek diekspor sebagai ZIP");
    } catch (error: any) {
      toast.error("Ekspor gagal: " + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteFile = async (id: number | undefined, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!id) {
      toast.error("File tidak valid untuk dihapus");
      return;
    }
    if (isDemo) {
      toast.error("Mode Demo: Anda tidak dapat menghapus file.");
      return;
    }
    setConfirmState({
      title: "Hapus file?",
      description: "Tindakan ini tidak bisa dibatalkan.",
      onConfirm: async () => {
        await db.files.delete(id);
        if (activeFile?.id === id) {
          setActiveFile(null);
          setCode("");
        }
        loadFiles();
        toast.success("File dihapus");
        setConfirmState(null);
      }
    });
  };

  const handleDeleteFolder = async (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDemo) {
      toast.error("Mode Demo: Anda tidak dapat menghapus folder.");
      return;
    }
    setConfirmState({
      title: `Hapus folder "${path}"?`,
      description: "Semua file di dalam folder ini akan ikut terhapus.",
      onConfirm: async () => {
        const filesToDelete = files.filter(f => f.path === path || f.path.startsWith(path + "/"));
        const ids = filesToDelete.map(f => f.id!).filter(id => id !== undefined);
        await db.files.bulkDelete(ids);
        if (activeFile && filesToDelete.some(f => f.id === activeFile.id)) {
          setActiveFile(null);
          setCode("");
        }
        loadFiles();
        toast.success("Folder dihapus");
        setConfirmState(null);
      }
    });
  };

  const handleRenameFile = async (oldPath: string, newName: string) => {
    if (isDemo) {
      toast.error("Mode Demo: Anda tidak dapat mengubah nama file.");
      return;
    }
    if (!files || !Array.isArray(files)) return;
    const file = files.find(f => f.path === oldPath);
    if (!file) return;

    const parts = file.path.split("/");
    parts[parts.length - 1] = newName;
    const newPath = parts.join("/");

    await db.files.update(file.id!, { path: newPath, updatedAt: Date.now() });
    loadFiles();
    toast.success("Nama file diperbarui");
  };

  const handleRenameFolder = async (oldPath: string, newName: string) => {
    if (isDemo) {
      toast.error("Mode Demo: Anda tidak dapat mengubah nama folder.");
      return;
    }
    
    const parts = oldPath.split("/");
    parts[parts.length - 1] = newName;
    const newFolderPath = parts.join("/");

    const affectedFiles = files.filter(f => f.path === oldPath || f.path.startsWith(oldPath + "/"));
    
    for (const file of affectedFiles) {
      const newFilePath = file.path.replace(oldPath, newFolderPath);
      await db.files.update(file.id!, { path: newFilePath, updatedAt: Date.now() });
    }
    
    loadFiles();
    toast.success("Nama folder diperbarui");
  };

  const buildFileTree = (files: ProjectFile[]) => {
    const root: any = { name: "root", type: "folder", children: [], path: "" };
    
    files.forEach(file => {
      const parts = file.path.split("/");
      let current = root;
      
      parts.forEach((part, i) => {
        const isLast = i === parts.length - 1;
        
        // Ensure current has children array
        if (!current.children) {
          current.children = [];
          current.type = "folder";
        }

        let existing = current.children.find((c: any) => c.name === part);
        
        if (!existing) {
          existing = {
            name: part,
            path: parts.slice(0, i + 1).join("/"),
            type: isLast ? "file" : "folder",
            children: isLast ? undefined : [],
            fileId: isLast ? file.id : undefined,
            file: isLast ? file : undefined
          };
          current.children.push(existing);
        }
        current = existing;
      });
    });
    
    return root.children;
  };

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) newExpanded.delete(path);
    else newExpanded.add(path);
    setExpandedFolders(newExpanded);
  };

  const renderTree = (nodes: any[], level = 0) => {
    return nodes.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === "folder" ? -1 : 1;
    }).map(node => {
      const isExpanded = expandedFolders.has(node.path);
      
      if (node.type === "folder") {
        return (
          <div key={node.path}>
            <div
              onClick={() => toggleFolder(node.path)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm text-white/40 hover:bg-white/5 hover:text-white/60 transition-all cursor-pointer group"
              style={{ paddingLeft: `${level * 12 + 12}px` }}
            >
              <div className="flex items-center gap-2 truncate">
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                <Folder className="w-3.5 h-3.5 text-blue-400/50" />
                <span className="truncate">{node.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowRenameModal({ type: "folder", oldPath: node.path });
                    setNewName(node.name);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-blue-400 transition-all"
                >
                  <Code className="w-3 h-3" />
                </button>
                <button 
                  onClick={(e) => handleDeleteFolder(node.path, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
            {isExpanded && renderTree(node.children, level + 1)}
          </div>
        );
      }
      
      return (
        <div
          key={node.path}
          onClick={() => selectFile(node.file)}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2 text-sm transition-all group cursor-pointer min-h-[40px]",
            activeFile?.id === node.fileId ? "bg-white/10 text-white" : "text-white/40 hover:bg-white/5 hover:text-white/60"
          )}
          style={{ paddingLeft: `${level * 12 + 12}px` }}
        >
          <div className="flex items-center gap-2 truncate">
            <FileCode className={cn("w-3.5 h-3.5", activeFile?.id === node.fileId ? "text-blue-400" : "text-white/20")} />
            <span className="truncate">{node.name}</span>
          </div>
          <div className="relative">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenu(activeMenu === node.path ? null : node.path);
              }}
              className="p-2 hover:text-white transition-all"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {activeMenu === node.path && (
              <div className="absolute right-0 mt-1 w-36 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowRenameModal({ type: "file", oldPath: node.path });
                    setNewName(node.name);
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-[10px] font-bold text-white/60 hover:bg-white/5 transition-all"
                >
                  <Code className="w-3 h-3" />
                  Ganti Nama
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFile(node.fileId, e);
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-[10px] font-bold text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                  Hapus
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const blob = new Blob([node.file.content], { type: "text/plain" });
                    saveAs(blob, node.name);
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-[10px] font-bold text-white/60 hover:bg-white/5 transition-all"
                >
                  <Download className="w-3 h-3" />
                  Unduh
                </button>
              </div>
            )}
          </div>
        </div>
      );
    });
  };

  const handleDeploy = async () => {
    const token = localStorage.getItem("vercel_token");
    const usingServerToken = !token || token === "TRIAL_MODE_ACTIVE";

    if (usingServerToken) {
      toast.error("Token Vercel wajib diisi. Mode demo tidak dapat melakukan deploy nyata.");
      return;
    }

    setIsDeploying(true);
    try {
      const allFiles = await db.files.where("projectId").equals(projectName).toArray();
      const deployableFiles = allFiles.filter(f => !f.isFolder && f.content !== "FOLDER_MARKER");

      if (deployableFiles.length === 0) {
        toast.error("Tidak ada file yang bisa di-deploy. Pastikan proyek berisi file valid.");
        return;
      }

      const normalizedFiles = deployableFiles.map((file) => ({
        ...file,
        path: file.path.replace(/^\.\//, "").replace(/\\/g, "/").replace(/^\/+/, "")
      }));

      const topLevelRoots = Array.from(new Set(
        normalizedFiles
          .map((file) => file.path.split("/")[0])
          .filter(Boolean)
      ));

      const shouldStripSingleRootFolder =
        topLevelRoots.length === 1 &&
        normalizedFiles.every((file) => file.path.startsWith(`${topLevelRoots[0]}/`));

      const payloadFiles = normalizedFiles.map(f => ({
        path: shouldStripSingleRootFolder
          ? f.path.replace(new RegExp(`^${topLevelRoots[0]}/`), "")
          : f.path,
        content: toBase64(f.content) // Unicode-safe base64
      }));


      const hasEntryFile = payloadFiles.some((file) => /(^|\/)index\.html$/i.test(file.path));
      const hasPackageJson = payloadFiles.some((file) => /(^|\/)package\.json$/i.test(file.path));
      if (!hasEntryFile && !hasPackageJson) {
        toast.warning("Proyek tidak memiliki index.html atau package.json. Deployment bisa berhasil, tapi web mungkin tidak bisa dibuka.");
      }

      // Inject PWA files if enabled and not present
      if (isPwaEnabled) {
        const hasManifest = allFiles.some(f => f.path === "manifest.json");
        const hasSW = allFiles.some(f => f.path === "sw.js");

        if (!hasManifest) {
          const manifest = {
            name: projectName,
            short_name: projectName,
            start_url: "/",
            display: "standalone",
            background_color: "#000000",
            theme_color: "#3b82f6",
            icons: [
              {
                src: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTpGGArTE_eXrg4L5F3A3LPOjjxf8fkt3N5urx4iuR5xN-E6B2pCIzej5o&s=10",
                sizes: "192x192",
                type: "image/png"
              }
            ]
          };
          payloadFiles.push({
            path: "manifest.json",
            content: toBase64(JSON.stringify(manifest, null, 2))
          });
        }

        if (!hasSW) {
          const sw = `self.addEventListener('install', (e) => { e.waitUntil(caches.open('v1').then(c => c.addAll(['/']))); });\nself.addEventListener('fetch', (e) => { e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))); });`;
          payloadFiles.push({
            path: "sw.js",
            content: toBase64(sw)
          });
        }
      }

      const sanitizedDomain = domainName
        ? domainName.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 63)
        : "";

      const selectedFramework = framework === "auto" ? detectFrameworkFromFiles(allFiles) : (framework || null);
      const response = await fetch("https://api.vercel.com/v13/deployments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: sanitizedDomain || projectName,
          files: payloadFiles.map((file) => ({
            file: file.path,
            data: file.content,
            encoding: "base64"
          })),
          projectSettings: {
            framework: selectedFramework
          }
        })
      });

      const data = await response.json();
      if (response.ok) {
        setDeployedUrl(data.url);
        localStorage.setItem(`deployed_url_${projectName}`, data.url);
        localStorage.setItem(`framework_${projectName}`, framework || "auto");
        
        // Mark project as deployed in DB
        const project = await db.projects.get(projectName);
        if (project) {
          await db.projects.update(projectName, { isDeployed: true, lastDeployedAt: Date.now(), deploymentUrl: data.url, updatedAt: Date.now() });
        } else {
          await db.projects.add({
            id: projectName,
            name: projectName,
            createdAt: Date.now(),
            isDeployed: true,
            lastDeployedAt: Date.now(),
            deploymentUrl: data.url,
            source: "manual"
          });
        }

        toast.success(`Deployment live di ${data.url}`);
        window.open(`https://${data.url}`, "_blank");
        setShowDeployConfig(false);
        loadRepositories();
      } else {
        const errorMsg = typeof data.error === "string" 
          ? data.error 
          : (data.error?.message || "Deployment gagal");
        toast.error(errorMsg);
      }
    } catch (error: any) {
      toast.error("Kesalahan deployment: " + error.message);
    } finally {
      setIsDeploying(false);
    }
  };

  if (editorMode === "menu") {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-black min-h-screen">
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <button 
            onClick={() => {
              if (isDemo) {
                toast.error("Mode Demo: Anda tidak dapat menggunakan Coding Manual.");
                return;
              }
              const generatedProject = `manual-${Date.now()}`;
              setProjectName(generatedProject);
              setProjectTabs(prev => (prev.includes(generatedProject) ? prev : [...prev, generatedProject]));
              db.projects.put({
                id: generatedProject,
                name: generatedProject,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                source: "manual",
                temporary: false
              });
              setEditorMode("editor");
              toast.success("Proyek coding manual dibuat.");
            }}
            className={cn(
              "group p-6 md:p-8 rounded-[32px] md:rounded-[40px] bg-white/5 border border-white/10 transition-all text-left space-y-4 min-h-[160px]",
              isDemo ? "opacity-50 cursor-not-allowed" : "hover:border-blue-500/50"
            )}
          >
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FilePlus className="w-6 h-6 md:w-8 md:h-8" />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-bold text-white">Coding Manual</h3>
              <p className="text-xs md:text-sm text-white/40">Mulai proyek baru dan tulis kode dari awal.</p>
            </div>
          </button>

          <label className="group p-6 md:p-8 rounded-[32px] md:rounded-[40px] bg-white/5 border border-white/10 hover:border-green-500/50 transition-all text-left space-y-4 cursor-pointer min-h-[160px] relative overflow-hidden">
            {isExtracting && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-20 animate-in fade-in">
                <Loader2 className="w-8 h-8 text-green-400 animate-spin mb-2" />
                <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Mengekstrak...</p>
              </div>
            )}
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-green-500/10 text-green-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Upload className="w-6 h-6 md:w-8 md:h-8" />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-bold text-white">Upload Files</h3>
              <p className="text-xs md:text-sm text-white/40">Impor file HTML, CSS, JS atau ZIP lokal.</p>
            </div>
            <input type="file" multiple className="hidden" id="menu-upload" onChange={async (e) => {
              await handleFileUpload(e);
              setEditorMode("editor");
            }} />
            <button onClick={() => document.getElementById("menu-upload")?.click()} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          </label>

          <button 
            onClick={() => {
              if (isDemo) {
                toast.error("Mode Demo: Anda tidak dapat memuat repositori.");
                return;
              }
              setEditorMode("editor");
            }}
            className={cn(
              "group p-6 md:p-8 rounded-[32px] md:rounded-[40px] bg-white/5 border border-white/10 transition-all text-left space-y-4 min-h-[160px]",
              isDemo ? "opacity-50 cursor-not-allowed" : "hover:border-purple-500/50"
            )}
          >
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Globe className="w-6 h-6 md:w-8 md:h-8" />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-bold text-white">Select Repository</h3>
              <p className="text-xs md:text-sm text-white/40">Muat proyek yang ada dari database lokal Anda.</p>
            </div>
          </button>
          <div className="md:col-span-2 p-4 rounded-3xl bg-white/5 border border-white/10 max-h-48 overflow-y-auto">
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-3">Repository Tersimpan</p>
            <div className="space-y-2">
              {repositories.map((repo) => (
                <div key={repo.id} className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between gap-3">
                  <button
                    onClick={() => {
                      setProjectName(repo.id);
                      setEditorMode("editor");
                      setProjectTabs(prev => (prev.includes(repo.id) ? prev : [...prev, repo.id]));
                    }}
                    className="flex items-center gap-2 min-w-0"
                  >
                    <FolderGit2 className="w-4 h-4 text-blue-400 shrink-0" />
                    <p className="text-sm font-bold text-white truncate">{repo.name}</p>
                  </button>
                  <button
                    onClick={() =>
                      setConfirmState({
                        title: `Hapus repository "${repo.name}"?`,
                        description: "Histori repo dan semua file lokal akan dihapus.",
                        onConfirm: async () => {
                          await db.files.where("projectId").equals(repo.id).delete();
                          await db.projects.delete(repo.id);
                          await loadRepositories();
                          if (projectName === repo.id) {
                            setProjectName("default-project");
                            setEditorMode("menu");
                          }
                          setConfirmState(null);
                          toast.success("Repository dihapus.");
                        }
                      })
                    }
                    className="p-2 text-white/30 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 md:p-8 rounded-[32px] md:rounded-[40px] bg-blue-600/10 border border-blue-600/20 flex flex-col justify-center space-y-3">
            <div className="flex items-center gap-2 text-blue-400">
              <AlertCircle className="w-5 h-5" />
              <span className="font-bold uppercase tracking-widest text-[10px] md:text-xs">Info Token</span>
            </div>
            <p className="text-[10px] md:text-xs text-blue-400/60 leading-relaxed">
              Menggunakan Token Vercel Anda sendiri memberikan akses penuh ke editor kode. Mode Demo terbatas hanya pada unggahan.
            </p>
            <a 
              href="https://vercel.com/account/tokens" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[10px] text-blue-400 hover:underline font-bold uppercase tracking-widest mt-2"
            >
              Ambil Token Vercel Anda di sini
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-56px)] md:h-[100dvh] bg-black overflow-hidden relative">
      {/* Back to Menu Button (Mobile) */}
      <button 
        onClick={() => setEditorMode("menu")}
        className="md:hidden absolute top-16 left-4 z-50 p-2 bg-white/10 backdrop-blur-md rounded-full text-white"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      {/* Deployment Config Modal */}
      {showDeployConfig && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-[32px] p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Deploy to Vercel</h3>
              <button onClick={() => setShowDeployConfig(false)} className="text-white/40 hover:text-white">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-white/40 font-mono uppercase">Repository</label>
                <div className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white/80 text-sm">
                  {projectName}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-white/40 font-mono uppercase">Framework Preset</label>
                <select 
                  value={framework || ""}
                  onChange={(e) => setFramework(e.target.value || null)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none transition-all appearance-none"
                >
                  {frameworks.map(f => (
                    <option key={f.id || "null"} value={f.id || ""}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-white/40 font-mono uppercase">Custom Domain (opsional)</label>
                <input
                  type="text"
                  value={domainName}
                  onChange={(e) => setDomainName(e.target.value)}
                  placeholder="nama-domain-vercel"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none transition-all"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-white">Enable PWA</p>
                  <p className="text-[10px] text-white/40">Inject manifest.json & sw.js</p>
                </div>
                <button 
                  onClick={() => setIsPwaEnabled(!isPwaEnabled)}
                  className={cn(
                    "w-12 h-6 rounded-full transition-all relative",
                    isPwaEnabled ? "bg-blue-600" : "bg-white/10"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                    isPwaEnabled ? "left-7" : "left-1"
                  )} />
                </button>
              </div>
            </div>

            <button 
              onClick={handleDeploy}
              disabled={isDeploying}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
            >
              {isDeploying ? <Loader2 className="w-5 h-5 animate-spin" /> : <Rocket className="w-5 h-5" />}
              {isDeploying ? "Deploying..." : "Confirm Deployment"}
            </button>
          </div>
        </div>
      )}

      {/* File Explorer Sidebar */}
      <div className="w-48 md:w-72 border-r border-white/10 flex flex-col bg-[#0a0a0a] backdrop-blur-xl shrink-0">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-blue-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Explorer</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <button 
                onClick={() => setActiveMenu(activeMenu === "explorer" ? null : "explorer")}
                className="p-1.5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-all"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {activeMenu === "explorer" && (
                <div className="absolute right-0 mt-2 w-40 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                  <label className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-white/60 hover:bg-white/5 transition-all cursor-pointer">
                    <Upload className="w-4 h-4" />
                    Import File
                    <input type="file" multiple className="hidden" onChange={(e) => {
                      handleFileUpload(e);
                      setActiveMenu(null);
                    }} />
                  </label>
                  <button 
                    onClick={() => {
                      setShowNewFileModal(true);
                      setActiveMenu(null);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-white/60 hover:bg-white/5 transition-all"
                  >
                    <FilePlus className="w-4 h-4" />
                    New File
                  </button>
                  <button 
                    onClick={() => {
                      handleDownloadZip();
                      setActiveMenu(null);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-green-400 hover:bg-green-500/10 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Export ZIP
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
          {renderTree(buildFileTree(files))}
          {files.length === 0 && (
            <div className="p-8 text-center space-y-2">
              <Folder className="w-8 h-8 text-white/10 mx-auto" />
              <p className="text-[10px] text-white/20 uppercase font-mono">No files in VFS</p>
            </div>
          )}
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-14 border-b border-white/10 bg-[#0a0a0a] flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-4 truncate">
            <div className="hidden md:flex items-center gap-1 max-w-[340px] overflow-x-auto custom-scrollbar">
              {projectTabs.map(tab => (
                <div key={tab} className={cn("flex items-center gap-2 px-2 py-1 rounded-lg border text-xs", tab === projectName ? "bg-white/10 border-white/20 text-white" : "bg-white/5 border-white/10 text-white/60")}>
                  <button onClick={() => setProjectName(tab)}>{tab}</button>
                  <button onClick={async () => {
                    const projectFiles = await db.files.where("projectId").equals(tab).toArray();
                    const closeTab = async () => {
                      if (tab.startsWith("temp-")) {
                        await db.files.where("projectId").equals(tab).delete();
                      }
                      setProjectTabs(prev => prev.filter(t => t !== tab));
                      if (projectName === tab) {
                        const remain = projectTabs.filter(t => t !== tab);
                        if (remain.length) setProjectName(remain[0]);
                        else setEditorMode("menu");
                      }
                      setConfirmState(null);
                    };
                    if (projectFiles.some(f => f.updatedAt > Date.now() - 5 * 60 * 1000)) {
                      setConfirmState({
                        title: "Tutup tab?",
                        description: "Perubahan terbaru mungkin belum disimpan.",
                        onConfirm: closeTab
                      });
                      return;
                    }
                    await closeTab();
                  }}>×</button>
                </div>
              ))}
            </div>
            <button 
              onClick={() => setShowRenameModal({ type: "project", oldPath: projectName })}
              className="flex items-center gap-2 text-white/40 hover:text-white transition-all min-h-[40px] px-2"
            >
              <Code className="w-4 h-4" />
              <span className="text-xs font-mono uppercase tracking-widest truncate max-w-[100px] md:max-w-none">{projectName}</span>
            </button>
            {deployedUrl && (
              <a 
                href={`https://${deployedUrl}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-[10px] text-green-400 font-bold hover:bg-green-500/20 transition-all"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                {deployedUrl}
              </a>
            )}
          </div>
          <div className="flex items-center gap-1.5 md:gap-3">
            <button 
              onClick={() => setShowPreview(!showPreview)}
              className={cn(
                "flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl border transition-all text-xs font-bold min-h-[40px]",
                showPreview ? "bg-blue-600 border-blue-500 text-white" : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
              )}
            >
              {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{showPreview ? "Sembunyikan" : "Preview"}</span>
            </button>
            <button 
              onClick={handleSave}
              disabled={!activeFile || isDemo}
              className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-xl border border-white/10 transition-all disabled:opacity-50 min-h-[40px]"
            >
              <Save className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Simpan</span>
            </button>
            <button 
              onClick={() => setShowDeployConfig(true)}
              className="flex items-center gap-2 px-3 md:px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all min-h-[40px]"
            >
              <Rocket className="w-3.5 h-3.5" />
              Deploy
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden relative">
          {/* Demo Lock Overlay */}
          {isDemo && activeFile && (
            <div className="absolute inset-0 z-10 bg-black/20 backdrop-blur-[2px] pointer-events-none flex items-center justify-center">
              <div className="p-4 rounded-2xl bg-black/60 border border-white/10 flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
                <p className="text-xs font-bold text-white/80">Mode Demo: Editor Terkunci</p>
              </div>
            </div>
          )}
          <div className={cn("flex-1 flex flex-col min-w-0", showPreview && "hidden lg:flex")}>
            {activeFile ? (
              <>
                <div className="h-10 border-b border-white/5 bg-black/40 flex items-center px-6">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-xs font-medium text-white/60">{activeFile.path}</span>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden editor-container min-h-0">
                  <CodeMirror
                    value={code}
                    height="100%"
                    theme="dark"
                    extensions={getLanguage(activeFile.path)}
                    onChange={(value) => setCode(value)}
                    className="text-sm h-full min-h-0"
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-4">
                <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <Code className="w-10 h-10 text-white/10" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-white">No file selected</h3>
                  <p className="text-white/40 max-w-xs">Select a file from the explorer or create a new one to start coding.</p>
                </div>
              </div>
            )}
          </div>

          {showPreview && (
            <div className={cn(
              "flex-1 bg-white flex flex-col",
              !showPreview && "hidden"
            )}>
              <div className="h-10 border-b border-black/10 bg-gray-100 flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  </div>
                  <span className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-2">Live Preview</span>
                </div>
                <button 
                  onClick={() => window.open(previewUrl || "", "_blank")}
                  className="p-1.5 hover:bg-black/5 rounded-lg text-black/40 transition-all"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex-1 bg-white relative">
                {previewUrl ? (
                  <iframe 
                    src={previewUrl} 
                    className="w-full h-full border-none"
                    title="Preview"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
                      <AlertCircle className="w-8 h-8 text-gray-300" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-gray-400">No index.html found</p>
                      <p className="text-xs text-gray-300 max-w-[200px]">Create an index.html file in the root to see a live preview.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rename Modal */}
      {showRenameModal && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-[32px] p-8 space-y-6 shadow-2xl relative text-white">
            <div className="space-y-2">
              <h3 className="text-xl font-black text-white uppercase tracking-tighter">
                {showRenameModal.type === "project" && !projectName ? "Proyek Baru" : "Ganti Nama"}
              </h3>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">
                Masukkan nama untuk {showRenameModal.type}
              </p>
            </div>
            <input 
              type="text" 
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Nama baru..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-blue-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  document.getElementById("rename-confirm-btn")?.click();
                }
              }}
            />
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setShowRenameModal(null);
                  setNewName("");
                }}
                className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl transition-all"
              >
                Batal
              </button>
              <button 
                id="rename-confirm-btn"
                onClick={async () => {
                  if (!newName) return;
                  if (showRenameModal.type === "project") {
                    setProjectName(newName);
                    setEditorMode("editor");
                  } else if (showRenameModal.type === "file") {
                    await handleRenameFile(showRenameModal.oldPath, newName);
                  } else if (showRenameModal.type === "folder") {
                    await handleRenameFolder(showRenameModal.oldPath, newName);
                  }
                  setShowRenameModal(null);
                  setNewName("");
                }}
                className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all"
              >
                Konfirmasi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New File Modal */}
      {showNewFileModal && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-[32px] p-8 space-y-6 shadow-2xl relative text-white">
            <div className="space-y-2">
              <h3 className="text-xl font-black text-white uppercase tracking-tighter">File Baru</h3>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Masukkan nama file (bisa dengan path, ex: src/App.js)</p>
            </div>
            <input 
              type="text" 
              value={newFilePath}
              onChange={e => setNewFilePath(e.target.value)}
              placeholder="index.html..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-blue-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  document.getElementById("new-file-confirm-btn")?.click();
                }
              }}
            />
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setShowNewFileModal(false);
                  setNewFilePath("");
                }}
                className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl transition-all"
              >
                Batal
              </button>
              <button 
                id="new-file-confirm-btn"
                onClick={async () => {
                  if (!newFilePath) return;
                  await handleCreateFile(newFilePath);
                  setShowNewFileModal(false);
                  setNewFilePath("");
                }}
                className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all"
              >
                Buat File
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmState && (
        <div className="fixed inset-0 z-[140] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 space-y-5">
            <div className="space-y-2">
              <h4 className="text-lg font-bold text-white">{confirmState.title}</h4>
              <p className="text-sm text-white/50">{confirmState.description}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmState(null)}
                className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-semibold"
              >
                Batal
              </button>
              <button
                onClick={confirmState.onConfirm}
                className="flex-1 py-3 rounded-xl bg-red-500/90 hover:bg-red-500 text-white text-sm font-semibold"
              >
                Ya, lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extracting Overlay */}
      {isExtracting && (
        <div className="fixed inset-0 z-[130] bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center space-y-6 text-white">
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Upload className="w-8 h-8 text-blue-400 animate-bounce" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Mengekstrak ZIP</h3>
            <p className="text-white/40 text-sm font-bold uppercase tracking-widest">Mohon tunggu sebentar...</p>
          </div>
        </div>
      )}
    </div>
  );
}
