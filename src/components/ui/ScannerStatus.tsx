import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { 
  ShieldCheck, 
  ShieldAlert, 
  Database, 
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { SystemCheckResult } from '@/types/ssh';

interface ScannerStatusProps {
  systemCheck: SystemCheckResult | null;
  isTesting: boolean;
}

export default function ScannerStatus({ systemCheck, isTesting }: ScannerStatusProps) {
  const renderScannerStatus = (
    name: string, 
    installed: boolean, 
    version: string
  ) => (
    <div className="flex items-center justify-between gap-4 p-2">
      <div className="flex items-center gap-2">
        <Database className="w-4 h-4 text-gray-500" />
        <span className="font-medium">{name}</span>
      </div>

      <div className="flex items-center gap-2">
        {installed ? (
          <>
            <Badge variant="success" className="bg-green-100 text-green-700 whitespace-nowrap">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Installed
            </Badge>
            <span className="text-sm font-medium">v{version}</span>
            <HoverCard>
              <HoverCardTrigger>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 cursor-help">
                  <Database className="w-3 h-3 mr-1" />
                  DB Updated
                </Badge>
              </HoverCardTrigger>
              <HoverCardContent className="w-80">
                <div className="space-y-2">
                  <h4 className="font-medium">Database Of {name}</h4>
                  <p className="text-sm">
                    Path: /tmp/vscan/{name.toLowerCase()}-db
                    <br />
                    Sttus: Updated and Ready to Scan
                  </p>
                </div>
              </HoverCardContent>
            </HoverCard>
          </>
        ) : (
          <Badge variant="destructive" className="bg-red-100 text-red-700">
            <XCircle className="w-3 h-3 mr-1" />
            Not Installed
          </Badge>
        )}
      </div>
    </div>
  );

  if (isTesting) {
    return (
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Verifying scanners...</span>
          </div>
          <Progress value={33} className="h-2" />
        </div>
      </Card>
    );
  }

  if (!systemCheck) return null;

  const { scanners } = systemCheck;
  const allScannersInstalled = scanners.trivy.installed && scanners.grype.installed;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            {allScannersInstalled ? (
              <ShieldCheck className="w-5 h-5 text-green-500" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-yellow-500" />
            )}
            <h3 className="font-medium">Scanner Status</h3>
          </div>

          <div className="divide-y">
            {renderScannerStatus('Trivy', scanners.trivy.installed, scanners.trivy.version)}
            {renderScannerStatus('Grype', scanners.grype.installed, scanners.grype.version)}
          </div>

          {!allScannersInstalled && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Automated Installation</AlertTitle>
              <AlertDescription>
                 Missing scanners will be installed automatically during the connection test.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </Card>
    </div>
  );
}