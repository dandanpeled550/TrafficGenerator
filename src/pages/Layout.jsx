

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
    BarChart3, 
    Zap, 
    Settings, 
    Activity,
    TrendingUp,
    Globe,
    Users,
    FileText // Add FileText icon
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const navigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: BarChart3,
  },
  {
    title: "Campaigns",
    url: createPageUrl("Campaigns"),
    icon: Activity,
  },
  {
    title: "Traffic Generator",
    url: createPageUrl("Generator"),
    icon: Zap,
  },
  {
    title: "User Profiles", // New navigation item
    url: createPageUrl("UserProfiles"),
    icon: Users,
  },
  {
    title: "Analytics",
    url: createPageUrl("Analytics"),
    icon: TrendingUp,
  },
  {
    title: "Log Explorer", // New navigation item
    url: createPageUrl("Logs"),
    icon: FileText,
  },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-slate-950">
        <style>
          {`
            :root {
              --sidebar-background: 15 23 42;
              --sidebar-foreground: 148 163 184;
              --sidebar-primary: 59 130 246;
              --sidebar-primary-foreground: 255 255 255;
              --sidebar-accent: 30 41 59;
              --sidebar-accent-foreground: 148 163 184;
              --sidebar-border: 30 41 59;
              --sidebar-ring: 59 130 246;
            }
          `}
        </style>
        
        <Sidebar className="border-r border-slate-800 bg-slate-900">
          <SidebarHeader className="border-b border-slate-800 p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-xl text-white">TrafficForge</h2>
                <p className="text-xs text-slate-400 font-medium">Professional Traffic Generator</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-4">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 py-3">
                Navigation
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`hover:bg-slate-800/50 hover:text-blue-400 transition-all duration-300 rounded-xl py-3 px-4 ${
                          location.pathname === item.url 
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-lg shadow-blue-500/10' 
                            : 'text-slate-300'
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3">
                          <item.icon className="w-5 h-5" />
                          <span className="font-semibold">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="mt-8">
              <SidebarGroupLabel className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 py-3">
                Quick Stats
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="px-4 py-3 space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-green-400" />
                      <span className="text-slate-300">Active Sessions</span>
                    </div>
                    <span className="font-bold text-green-400">0</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Total Requests</span>
                    <span className="font-bold text-slate-200">0</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">This Hour</span>
                    <span className="font-bold text-blue-400">0</span>
                  </div>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-slate-800 p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-600 rounded-full flex items-center justify-center">
                <span className="text-slate-200 font-bold text-sm">U</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-200 text-sm truncate">Traffic Engineer</p>
                <p className="text-xs text-slate-400 truncate">Manage your campaigns</p>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-slate-900/50 border-b border-slate-800 px-6 py-4 md:hidden backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-slate-800 p-2 rounded-lg transition-colors duration-200 text-slate-300" />
              <h1 className="text-xl font-bold text-white">TrafficForge</h1>
            </div>
          </header>

          <div className="flex-1 overflow-auto bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

