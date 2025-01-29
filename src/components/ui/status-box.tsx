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
  Eye,
  EyeOff,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from 'lucide-react';

export interface PhaseInfo {
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
  progress: number;
}

export interface StatusBoxProps {
  title: string;
  logs: string[];
  onClearLogs?: () => void;
  status?: string;
  phase?: string;
  phaseInfo?: Record<string, PhaseInfo>;
  className?: string;
  autoScroll?: boolean;
  progress?: number;
  formatLog: (log: string) => React.ReactNode;
  helpContent: React.ReactNode;
  processingPhases?: string[];
}

export const StatusBox = React.forwardRef<HTMLDivElement, StatusBoxProps>(({
  title,
  logs,
  onClearLogs,
  status,
  phase,
  phaseInfo,
  className,
  autoScroll = true,
  progress,
  formatLog,
  helpContent,
  processingPhases = [],
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

  const currentPhaseInfo = phase && phaseInfo ? phaseInfo[phase] : null;

  return (
    <Card ref={ref} className={cn("bg-white border shadow-sm rounded-lg", className)}>
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">{title}</h3>
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
              className="h-[450px] overflow-y-auto"
              onScroll={handleScroll}
            >
              <div className="p-4 space-y-1">
                {logs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                    <div className="h-8 w-8 mb-2 text-gray-400" />
                    <p>Waiting to start operation...</p>
                    <p className="text-xs">Logs will appear here</p>
                  </div>
                ) : (
                  logs.map((log, index) => (
                    <div key={index}>
                      {formatLog(log)}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {phase && processingPhases.includes(phase) && (
          <div className="absolute bottom-4 right-4 flex items-center gap-2">
            <div className="animate-pulse">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
            </div>
            <span className="text-xs text-muted-foreground">Processing...</span>
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
          <HoverCardContent className="w-80">
            {helpContent}
          </HoverCardContent>
        </HoverCard>
      </CardContent>
    </Card>
  );
});

StatusBox.displayName = "StatusBox";

export default StatusBox;