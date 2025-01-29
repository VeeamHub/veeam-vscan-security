import type { LucideIcon } from 'lucide-react';

export type MountPhase = 'publishing' | 'mounting' | 'verifying' | 'completed' | 'failed';

export interface MountInfo {
  vmName: string;
  selectedDisks: Array<{
    mountPath: string;
  }>;
}

export interface PhaseInfo {
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
  progress: number;
}

export type MountPhaseInfo = Record<MountPhase, PhaseInfo>;