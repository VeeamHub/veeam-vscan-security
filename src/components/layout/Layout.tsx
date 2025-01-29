import { useState } from 'react';
import { NavLink, useLocation, Outlet } from 'react-router-dom';
import { cn } from "@/lib/utils";
import { useVScan } from '@/store/vscan-context';
import { useSSH } from '@/store/SSHContext';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  HoverCard,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Scan, 
  ShieldAlert, 
  Settings,
  Server,
  Terminal,
  CheckCircle2,
  XCircle,
  Menu,
  ChevronRight
} from 'lucide-react';

const menuItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/scans', label: 'Scans', icon: Scan },
  { path: '/vulnerabilities', label: 'Vulnerabilities', icon: ShieldAlert },
  { path: '/settings', label: 'Settings', icon: Settings },
];

interface NavContentProps {
  vbrConnected: boolean;
  serverInfo: any;
  sshConnected: boolean;
  connectedServer: any;
  currentPath: string;
  onNavClick?: () => void;
}

function NavContent({
  vbrConnected,
  serverInfo,
  sshConnected,
  connectedServer,
  currentPath,
  onNavClick
}: NavContentProps) {
  return (
    <div className="flex flex-col h-full">
      
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-center">
          <h1 className="text-xl font-semibold text-green-700 flex items-center gap-2 px-2">
            <ShieldAlert className="w-6 h-6 flex-shrink-0" />
            <span className="relative top-[1px]">vScan</span>
          </h1>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="py-6">
          
          <nav className="px-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onNavClick}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all",
                      "hover:bg-gray-50 hover:text-green-700",
                      "group relative",
                      isActive
                        ? "bg-green-50 text-green-700 shadow-sm"
                        : "text-gray-700"
                    )
                  }
                >
                  <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                  {item.label}
                  <ChevronRight className={cn(
                    "ml-auto h-4 w-4 opacity-0 -translate-x-2 transition-all",
                    "group-hover:opacity-100 group-hover:translate-x-0",
                    currentPath === item.path && "opacity-100 translate-x-0"
                  )} />
                </NavLink>
              );
            })}
          </nav>

          
          <div className="px-4 mt-4 space-y-4">
            
            <HoverCard>
              <HoverCardTrigger asChild>
                <div className="p-3 rounded-lg bg-gray-50 space-y-2 cursor-pointer hover:bg-gray-100 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Server className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">VBR Server</span>
                    </div>
                    {vbrConnected ? (
                      <Badge variant="success" className="bg-green-100 text-green-700">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="bg-red-100 text-red-700">
                        <XCircle className="w-3 h-3 mr-1" />
                        Disconnected
                      </Badge>
                    )}
                  </div>
                  {vbrConnected && serverInfo && (
                    <div className="text-xs space-y-1 text-gray-600">
                      <p className="font-medium">{serverInfo.server}</p>
                      <p className="text-gray-500">
                        {serverInfo.lastConnection?.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </HoverCardTrigger>
            </HoverCard>

            
<HoverCard>
  <HoverCardTrigger asChild>
    <div className="p-3 rounded-lg bg-gray-50 space-y-2 cursor-pointer hover:bg-gray-100 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Linux Scanner</span>
        </div>
        {sshConnected ? (
          <Badge variant="success" className="bg-green-100 text-green-700">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Connected
          </Badge>
        ) : (
          <Badge variant="destructive" className="bg-red-100 text-red-700">
            <XCircle className="w-3 h-3 mr-1" />
            Disconnected
          </Badge>
        )}
      </div>
      {sshConnected && connectedServer && (
        <div className="text-xs space-y-1 text-gray-600">
          <p className="text-gray-500">{connectedServer.ipAddress || connectedServer.address}</p>
          <p className="text-gray-500">
            {connectedServer.lastConnected ? new Date(connectedServer.lastConnected).toLocaleString() : new Date().toLocaleString()}
          </p>
        </div>
      )}
    </div>
  </HoverCardTrigger>
</HoverCard>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

export default function Layout() {
  const location = useLocation();
  const { connected: vbrConnected, serverInfo } = useVScan();
  const { isConnected: sshConnected, connectedServer } = useSSH();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetTrigger asChild className="lg:hidden fixed top-4 left-4 z-40">
          <Button variant="outline" size="icon">
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <NavContent
            vbrConnected={vbrConnected}
            serverInfo={serverInfo}
            sshConnected={sshConnected}
            connectedServer={connectedServer}
            currentPath={location.pathname}
            onNavClick={() => setIsMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      
      <aside className="hidden lg:flex w-64 flex-col bg-white border-r border-gray-200 shadow-sm">
        <NavContent
          vbrConnected={vbrConnected}
          serverInfo={serverInfo}
          sshConnected={sshConnected}
          connectedServer={connectedServer}
          currentPath={location.pathname}
        />
      </aside>

      
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}