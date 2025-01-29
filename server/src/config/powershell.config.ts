import { PowerShellOptions } from 'node-powershell';

export const PS_OPTIONS: PowerShellOptions = {
  debug: false,
  executableOptions: {
    '-NoProfile': true,
    '-NonInteractive': true,
    '-ExecutionPolicy': 'Bypass'
  }
};