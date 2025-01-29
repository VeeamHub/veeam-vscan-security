import { useState } from 'react';
import type { ScanPhase } from '@/types/scan';

export function useScanState() {
  const [scanState, setScanState] = useState({
    logs: [] as string[],
    status: '',
    phase: undefined as ScanPhase | undefined,
    isProcessing: false,
    progress: 0
  });

  const clearLogs = () => {
    setScanState(prev => ({ ...prev, logs: [] }));
  };

  return {
    scanState,
    setScanState,
    clearLogs
  };
}