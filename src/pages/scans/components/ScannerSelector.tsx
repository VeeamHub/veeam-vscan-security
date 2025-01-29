import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ScanStatus } from '@/components/ui/scan-status';
import { useScanState } from '@/hooks/useScanState';

interface ScannerSelectorProps {
  selectedScanner?: 'TRIVY' | 'GRYPE';
  onSelectScanner: (scanner: 'TRIVY' | 'GRYPE') => void;
  onStartScan: () => void; 
  disabled?: boolean;
  canStartScan?: boolean;
}

export default function ScannerSelector({
  selectedScanner,
  onSelectScanner,
  onStartScan,
  disabled,
  canStartScan
}: ScannerSelectorProps) {
  const { scanState, clearLogs } = useScanState();

  return (
    <div className="space-y-4">
      <Card>
        <div className="grid grid-cols-3 gap-4 p-6">
          <div>
            <h3 className="font-medium mb-2">SELECT SCANNER</h3>
            <Select
              value={selectedScanner}
              onValueChange={(value: 'TRIVY' | 'GRYPE') => onSelectScanner(value)}
              disabled={disabled || scanState.isProcessing}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select scanner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TRIVY">TRIVY</SelectItem>
                <SelectItem value="GRYPE">GRYPE</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <h3 className="font-medium mb-2">SCANNER NAME</h3>
            <div className="h-10 flex items-center">
              {selectedScanner}
            </div>
          </div>

          <div className="flex items-end">
            <Button
              className="w-full"
              onClick={onStartScan}
              disabled={!selectedScanner || disabled || !canStartScan || scanState.isProcessing}
            >
              START SCAN
            </Button>
          </div>
        </div>
      </Card>

      {(scanState.isProcessing || scanState.logs.length > 0) && (
        <ScanStatus
          logs={scanState.logs}
          onClearLogs={clearLogs}
          status={scanState.status}
          phase={scanState.phase}
          progress={scanState.progress}
        />
      )}
    </div>
  );
}