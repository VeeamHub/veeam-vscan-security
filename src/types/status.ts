import type { LucideIcon } from 'lucide-react';

export type MountPhase = 'publishing' | 'mounting' | 'verifying' | 'completed' | 'failed';

export interface PhaseInfo {
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
  progress: number;
}