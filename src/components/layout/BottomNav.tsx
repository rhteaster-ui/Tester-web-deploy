import React from "react";
import { Home, Rocket, Terminal, Code, Info } from "lucide-react";
import { cn } from "@/src/lib/utils";

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const navItems = [
  { id: "home", label: "Home", icon: Home },
  { id: "deploy", label: "Deploy", icon: Rocket },
  { id: "editor", label: "Editor", icon: Code },
  { id: "logs", label: "Logs", icon: Terminal },
  { id: "about", label: "About", icon: Info },
];

export function BottomNav({ activeTab, setActiveTab }: BottomNavProps) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-black/60 backdrop-blur-2xl border-t border-white/10 flex items-center justify-around px-2 z-50">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => setActiveTab(item.id)}
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 w-full h-full transition-all duration-300 relative",
            activeTab === item.id ? "text-blue-400" : "text-white/40"
          )}
        >
          <item.icon className={cn(
            "w-4 h-4 transition-transform duration-300",
            activeTab === item.id ? "scale-110" : ""
          )} />
          <span className="text-[8px] font-black uppercase tracking-tighter">{item.label}</span>
          {activeTab === item.id && (
            <div className="absolute bottom-0 w-6 h-0.5 bg-blue-400 rounded-t-full shadow-[0_0_10px_rgba(96,165,250,0.5)]" />
          )}
        </button>
      ))}
    </nav>
  );
}
