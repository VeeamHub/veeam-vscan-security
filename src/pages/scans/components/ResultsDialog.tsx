import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";
import ScanSummary from "./ScanSummary";
import type { Vulnerability } from "@/types/vscan";

interface ScanItem {
  vmName: string;
  vulnerabilities?: Vulnerability[];
  scanDate?: string;
  scanDuration?: number;
  selectedDisks?: Array<{
    id: string;
    name: string;
    location: string;
    mountPath?: string;
    capacityGB?: number;
    variableName: string;
  }>;
}

interface ResultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scanConfig: {
    items: ScanItem[];
    scannerType?: string;
    scanCompleted?: boolean;
  };
  isUnmounting: boolean;
  onContinueScanning: () => void;
  onViewResults: (keepMounted?: boolean) => Promise<void>;
}

export function ResultsDialog({
  open,
  onOpenChange,
  scanConfig,
  isUnmounting,
  onContinueScanning,
  onViewResults,
}: ResultsDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-3xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {isUnmounting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                Unmounting Disks...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Scan Completed Successfully
              </>
            )}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            {isUnmounting
              ? "Please wait while the disks are being unmounted..."
              : "The vulnerability scan has been completed. You can view the results or continue scanning with the current mounted disks."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="py-4">
          <ScanSummary scanConfig={scanConfig} />
        </div>
        
        <AlertDialogFooter className="gap-2 sm:gap-0">          
          <Button
            variant="secondary"
            onClick={onContinueScanning}
            disabled={isUnmounting}
            className="flex items-center gap-2"
          >
            Continue Scanning
          </Button>
          
          <div className="flex gap-2">            
            <Button
              variant="outline"
              onClick={() => onViewResults(true)}
              disabled={isUnmounting}
            >
              Keep Mounted & View
            </Button>            
            <Button
              variant="default"
              onClick={() => onViewResults(false)}
              disabled={isUnmounting}
              className="flex items-center gap-2"
            >
              {isUnmounting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Unmounting...
                </>
              ) : (
                "Unmount & View Results"
              )}
            </Button>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}