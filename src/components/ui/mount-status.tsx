import * as React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { 
  Eraser, 
  CheckCircle2, 
  Clock, 
  RotateCw,
  Info,
  XCircle,
  Terminal,
  HardDrive,
  FolderTree,
  AlertTriangle,
  Eye,
  EyeOff 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MountPhase, type PhaseInfo } from '@/types/mount';

interface MountStatusProps {
    logs: string[];
    onClearLogs?: () => void;
    status?: string;
    phase?: MountPhase;
    className?: string;
    autoScroll?: boolean;
    progress?: number;
    formatLog?: (log: string) => React.ReactNode;
  }

  const phaseInfo: Record<MountPhase, PhaseInfo> = {
    publishing: {
      label: "Publishing",
      description: "Publishing backup content...",
      icon: Clock,
      color: "text-blue-500 bg-blue-50 border-blue-200",
      progress: 25
    },
  mounting: {
    label: "Mounting",
    description: "Mounting disk images...",
    icon: RotateCw,
    color: "text-yellow-500 bg-yellow-50 border-yellow-200",
    progress: 50
  },
  verifying: {
    label: "Verifying",
    description: "Verifying mount points...",
    icon: RotateCw,
    color: "text-purple-500 bg-purple-50 border-purple-200",
    progress: 75
  },
  completed: {
    label: "Completed",
    description: "All disks mounted successfully",
    icon: CheckCircle2,
    color: "text-green-500 bg-green-50 border-green-200",
    progress: 100
  },
  failed: {
    label: "Failed",
    description: "Mount operation failed",
    icon: XCircle,
    color: "text-red-500 bg-red-50 border-red-200",
    progress: 100
  }
} as const;

export const MountStatus = React.forwardRef<HTMLDivElement, MountStatusProps>(({
    logs,
    onClearLogs,
    status,
    phase,
    className,
    autoScroll = true,
    progress,
    formatLog
  }, ref) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [showLogs, setShowLogs] = React.useState(true);
  const [isScrolledToBottom, setIsScrolledToBottom] = React.useState(true);

  React.useEffect(() => {
    if (autoScroll && scrollRef.current && isScrolledToBottom) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll, isScrolledToBottom]);

  const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 1;
    setIsScrolledToBottom(isBottom);
  }, []);

  const currentPhaseInfo = phase ? phaseInfo[phase] : null;

  const formatTimestamp = (timestamp: string) => (
    <Badge variant="outline" className="text-xs font-mono bg-slate-50/50 text-slate-500 shrink-0 whitespace-nowrap">
      {timestamp}
    </Badge>
  );

  const formatLogMessage = (log: string): React.ReactNode => {
    const ts = log.match(/\[(.*?)\]/)?.[1] || "";
    const content = log.replace(/\[.*?\]\s*/, "");

    if (log.includes("=== Starting")) {
      const matches = content.match(/=== Starting (.*?) for Server: (.*?) \(Attempt (\d+)\/(\d+)\)/);
      if (matches) {
        const [_, action, vmName, attempt, total] = matches;
        return (
          <div className="flex items-start gap-2 text-blue-600 border-t border-blue-200 pt-4 mt-2">
            <Terminal className="h-5 w-5 mt-1 text-blue-500" />
            <div className="flex-1">
              {formatTimestamp(ts)}
              <div className="font-medium">{action}</div>
              <div className="text-sm mt-1">
                <Badge variant="outline" className="text-blue-700 bg-blue-50">
                  {vmName}
                </Badge>
                <span className="ml-2 text-gray-500">
                  Attempt {attempt} of {total}
                </span>
              </div>
            </div>
          </div>
        );
      }
    }

    if (log.includes("Selected disks:")) {
      const disks = log.split(': ')[1]?.split(', ') || [];
      return (
        <div className="ml-8 mt-2 bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <HardDrive className="h-4 w-4 text-blue-500" />
            <span className="font-medium text-blue-700">Selected Disks</span>
            <Badge variant="secondary" className="ml-auto">
              {disks.length} disks
            </Badge>
          </div>
          <div className="grid gap-2">
            {disks.map((disk, i) => (
              <div key={i} className="flex items-center gap-2 text-sm bg-white p-2 rounded border border-slate-100">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                <code className="text-xs font-mono text-gray-600 flex-1">
                  {disk.trim()}
                </code>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (log.includes("Mount point:")) {
      const parts = log.match(/Mount point: (.*?) for disk: (.*)/);
      if (parts && parts[1] && parts[2]) {
        const mountPoint = parts[1];
        const disk = parts[2];
        
        const isFS = mountPoint.includes('rl_multiple-disks') || mountPoint.includes('boot');
        let mountType = 'Disk Image';
        let typeColor = 'text-blue-700 bg-blue-50';
        
        if (mountPoint.includes('boot/efi')) {
          mountType = 'EFI System';
          typeColor = 'text-purple-700 bg-purple-50';
        } else if (mountPoint.includes('/boot')) {
          mountType = 'Boot Partition';
          typeColor = 'text-orange-700 bg-orange-50';
        } else if (mountPoint.includes('home')) {
          mountType = 'Home Directory';
          typeColor = 'text-teal-700 bg-teal-50';
        } else if (mountPoint.includes('rl_multiple-disks')) {
          mountType = 'Root Filesystem';
          typeColor = 'text-green-700 bg-green-50';
        }

        return (
          <div className="ml-8 my-1.5 p-3 rounded-lg border border-slate-200 bg-white/50 hover:bg-white transition-colors">
            <div className="flex items-start gap-3">
              {isFS ? (
                <FolderTree className="h-4 w-4 text-green-500 mt-0.5" />
              ) : (
                <HardDrive className="h-4 w-4 text-blue-500 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {formatTimestamp(ts)}
                  <Badge variant="outline" className={cn("text-xs", typeColor)}>
                    {mountType}
                  </Badge>
                </div>
                {mountPoint && disk && (
                  <div className="grid gap-2 bg-slate-50 p-2 rounded-md text-xs font-mono">
                    <div className="flex items-start gap-2">
                      <span className="text-slate-500">Mount:</span>
                      <div className="flex-1 bg-white px-2 py-1 rounded border border-slate-200 break-all">
                        {mountPoint}
                      </div>
                    </div>
                    <div className="flex items-start gap-2 border-t border-slate-100 pt-2">
                      <span className="text-slate-500">Disk:</span>
                      <div className="flex-1 bg-white px-2 py-1 rounded border border-slate-200 break-all">
                        {disk}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      }
    }

    if (log.includes("Created publish session:")) {
      const sessionId = log.split(': ')[1];
      return (
        <div className="ml-6 p-3 rounded-lg bg-green-50 border border-green-200">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            {formatTimestamp(ts)}
            <span className="font-medium">Session Created</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <code className="px-2 py-1 bg-white rounded text-xs font-mono flex-1 border border-green-100 break-all">
              {sessionId}
            </code>
          </div>
        </div>
      );
    }

    if (log.includes("Verification")) {
      const isSuccess = log.includes("successful");
      const isAttempt = log.includes("attempt");
      
      return (
        <div className={cn(
          "ml-6 p-2 rounded-lg flex items-center gap-2",
          isSuccess ? "bg-green-50 text-green-600" : 
          isAttempt ? "bg-blue-50 text-blue-600" : "bg-gray-50 text-gray-600"
        )}>
          {isSuccess ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <Info className="h-4 w-4" />
          )}
          {formatTimestamp(ts)}
          <span className="text-sm">{content}</span>
        </div>
      );
    }

    if (log.includes("Error") || log.includes("❌")) {
      return (
        <div className="ml-4 flex items-center gap-2 text-red-600 bg-red-50 p-2 rounded-lg">
          <XCircle className="h-4 w-4 flex-shrink-0" />
          {formatTimestamp(ts)}
          <span className="text-sm">{content}</span>
        </div>
      );
    }

    if (log.includes("Success") || log.includes("✅") || log.includes("Successfully")) {
      return (
        <div className="ml-4 flex items-center gap-2 text-green-600 bg-green-50 p-2 rounded-lg">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          {formatTimestamp(ts)}
          <span className="text-sm">{content}</span>
        </div>
      );
    }

    if (log.includes("Warning")) {
      return (
        <div className="ml-4 flex items-center gap-2 text-yellow-600 bg-yellow-50 p-2 rounded-lg">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {formatTimestamp(ts)}
          <span className="text-sm">{content}</span>
        </div>
      );
    }

    return (
      <div className="text-gray-600 ml-4 p-1.5 flex items-start gap-2">
        {formatTimestamp(ts)}
        <span className="text-sm">{content}</span>
      </div>
    );
  };

  return (
    <Card ref={ref} className={cn("bg-white border shadow-sm rounded-lg", className)}>
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Mount Status</h3>
            {currentPhaseInfo && (
              <HoverCard>
                <HoverCardTrigger asChild>
                  <Badge 
                    variant="secondary" 
                    className={cn("cursor-help", currentPhaseInfo.color)}
                  >
                    {currentPhaseInfo.label}
                  </Badge>
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      {React.createElement(currentPhaseInfo.icon, {
                        className: "h-4 w-4"
                      })}
                      <p className="font-medium">{currentPhaseInfo.label}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {currentPhaseInfo.description}
                    </p>
                  </div>
                </HoverCardContent>
              </HoverCard>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onClearLogs && logs.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={onClearLogs}
                className="h-8 px-2"
              >
                <Eraser className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLogs(!showLogs)}
              className="h-8"
            >
              {showLogs ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {currentPhaseInfo && (
          <div className="space-y-4 mb-4">
            <Progress 
              value={progress ?? currentPhaseInfo.progress} 
              className="h-2"
            />
          </div>
        )}

        {status && (
          <div className={cn(
            "p-3 rounded-lg mb-4 border flex items-center gap-2",
            currentPhaseInfo?.color ?? "bg-gray-50 text-gray-700 border-gray-200"
          )}>
            {currentPhaseInfo && React.createElement(currentPhaseInfo.icon, {
              className: "h-4 w-4"
            })}
            <span className="text-sm">{status}</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
  {showLogs && (
    <div className="mx-4 mb-4 border rounded-md bg-slate-50">
      <div 
        ref={scrollRef}
        className="h-[450px] overflow-y-auto relative"
        onScroll={handleScroll}
      >
        <div className="p-4 space-y-1">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <Clock className="h-8 w-8 mb-2 text-gray-400" />
              <p>Waiting to start mount operation...</p>
              <p className="text-xs">Mount logs will appear here</p>
            </div>
          ) : (
            <div>
              {logs.map((log, index) => (
                <div key={index}>
                  {formatLog ? formatLog(log) : formatLogMessage(log)}
                </div>
              ))}
              {phase && ['mounting', 'verifying'].includes(phase) && (
                <div className="flex items-center gap-2 mt-2 text-blue-600">
                  <div className="animate-pulse">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                  </div>
                  <span className="text-xs">Processing...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )}

  <HoverCard>
    <HoverCardTrigger asChild>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 h-6 w-6 text-gray-400 hover:text-gray-600"
      >
        <Info className="h-4 w-4" />
      </Button>
    </HoverCardTrigger>
    <HoverCardContent align="end" className="w-80">
      <div className="space-y-2">
        <h4 className="font-medium">Log Information</h4>
        <div className="text-sm space-y-1">
          <p className="text-green-600">✅ Success messages</p>
          <p className="text-red-600">❌ Error messages</p>
          <p className="text-yellow-600">⚠️ Warning messages</p>
          <p className="text-blue-600">ℹ️ Mount operations</p>
          <p className="text-gray-600">📝 General info</p>
        </div>
      </div>
    </HoverCardContent>
  </HoverCard>
</CardContent>
    </Card>
  );
});

MountStatus.displayName = "MountStatus";

export default MountStatus;