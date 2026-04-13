import React from "react";
import { Home, Rocket, Code, Info, Settings, Clock } from "lucide-react";
import { cn } from "@/src/lib/utils";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const navItems = [
  { id: "home", label: "Home", icon: Home },
  { id: "deploy", label: "Deploy", icon: Rocket },
  { id: "editor", label: "Editor", icon: Code },
  { id: "about", label: "About", icon: Info },
];

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  return (
    <aside className="hidden md:flex flex-col w-64 h-screen border-r border-white/10 bg-black/50 backdrop-blur-xl sticky top-0">
      <div className="p-6 flex items-center gap-4 border-b border-white/10">
        <div className="w-14 h-14 rounded-2xl border border-white/10 overflow-hidden shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform duration-500">
          <img 
            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTpGGArTE_eXrg4L5F3A3LPOjjxf8fkt3N5urx4iuR5xN-E6B2pCIzej5o&s=10" 
            alt="Logo" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="flex flex-col">
          <span className="font-black text-xl text-white tracking-tighter leading-tight">Vercel deploy</span>
          <span className="text-[10px] text-blue-400 uppercase tracking-[0.2em] font-bold">R_hmt Ofc</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group",
              activeTab === item.id
                ? "bg-white/10 text-white shadow-inner"
                : "text-white/50 hover:bg-white/5 hover:text-white"
            )}
          >
            <item.icon className={cn(
              "w-5 h-5 transition-transform duration-300",
              activeTab === item.id ? "scale-110" : "group-hover:scale-110"
            )} />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 space-y-4 border-t border-white/10">
        {/* Trial Countdown Indicator */}
        <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-blue-400">
            <span>Trial Status</span>
            <Clock className="w-3 h-3" />
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full w-[85%] bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
          </div>
          <p className="text-[10px] text-white/40 font-medium">51 days remaining</p>
        </div>

        <button 
          onClick={() => setActiveTab("settings")}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300",
            activeTab === "settings" ? "bg-white/10 text-white" : "text-white/50 hover:bg-white/5 hover:text-white"
          )}
        >
          <Settings className="w-5 h-5" />
          <span className="font-medium">Settings</span>
        </button>
      </div>
    </aside>
  );
}
