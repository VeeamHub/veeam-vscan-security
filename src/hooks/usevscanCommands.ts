import { useCallback } from 'react';
import { useVScan } from '@/store/vscan-context';
import { useToast } from '@/components/ui/use-toast';
import type { 
  PowerShellResult, 
  VirtualMachine,
  RestorePoint,
  VBRDisk
} from '@/types/vscan';


const sortDisks = (disks: VBRDisk[]): VBRDisk[] => {
  return [...disks].sort((a, b) => {
    if (!a.VariableName || !b.VariableName) return 0;
    
    const aMatch = /disk_(\d+)_(\d+)/.exec(a.VariableName);
    const bMatch = /disk_(\d+)_(\d+)/.exec(b.VariableName);
    
    if (!aMatch?.[1] || !aMatch?.[2] || !bMatch?.[1] || !bMatch?.[2]) return 0;
    
    const aController = parseInt(aMatch[1]);
    const aUnit = parseInt(aMatch[2]);
    const bController = parseInt(bMatch[1]);
    const bUnit = parseInt(bMatch[2]);
    
    if (aController === bController) {
      return aUnit - bUnit;
    }
    return aController - bController;
  });
};

export function useVScanCommands() {
  const { executeCommand, connected } = useVScan();
  const { toast } = useToast();

  const getVirtualMachines = useCallback(async (searchTerm?: string): Promise<PowerShellResult<VirtualMachine[]>> => {
    if (!connected) {
      return { success: false, error: 'Not connected to VBR server', data: [] };
    }

    try {
      const script = `
        $ErrorActionPreference = "Stop"
        
        $searchTerm = '${searchTerm || ""}'
        
        try {
            Write-Output "Starting Server inventory collection..."
            Write-Output "Search term: $searchTerm"

            $vms = @{}  # Using hashtable to avoid duplicates
            $errors = @()
            
            $backups = Get-VBRBackup
            Write-Output "Found $($backups.Count) backups"
            
            foreach ($backup in $backups) {
                try {
                    $firstRestorePoint = Get-VBRRestorePoint -Backup $backup | 
                        Group-Object Name | 
                        ForEach-Object { $_.Group | Sort-Object CreationTime -Descending | Select-Object -First 1 }

                    foreach ($point in $firstRestorePoint) {
                        if ($point.Name -and (!$searchTerm -or $point.Name -like "*$searchTerm*")) {
                            $vmKey = $point.ObjectId.ToString()
                            
                            if (!$vms.ContainsKey($vmKey)) {
                                $vms[$vmKey] = @{
                                    Name = $point.Name
                                    Id = $vmKey
                                    Type = $point.Type
                                    Platform = $point.Platform
                                    JobName = $backup.Name
                                    JobId = $backup.Id.ToString()
                                    LastBackupDate = $point.CreationTime.ToString('o')
                                }
                            }
                        }
                    }
                }
                catch {
                    $errors += "Error processing backup $($backup.Name): $_"
                    Write-Output $errors[-1]
                    continue
                }
            }
            
            $uniqueVMs = @($vms.Values)
            Write-Output "Total unique VMs found: $($uniqueVMs.Count)"
            
            Write-Output "STARTJSON"
            @{
                success = $true 
                data = $uniqueVMs 
                
            } | ConvertTo-Json -Depth 10 -Compress 
            Write-Output "ENDJSON" 
        }
        catch {
            Write-Output "STARTJSON"
            @{
                success = $false
                error = $_.Exception.Message
                data = @()
            } | ConvertTo-Json -Compress
            Write-Output "ENDJSON"
        }
      `;

      const result = await executeCommand(script);
      const match = result.match(/STARTJSON\r?\n([\s\S]*?)\r?\nENDJSON/);
      
      if (!match) {
        throw new Error('Invalid response format from PowerShell');
      }

      const parsedResult = JSON.parse(match[1].trim());
      if (!parsedResult.success) {
        throw new Error(parsedResult.error);
      }

      return {
        success: true,
        data: Array.isArray(parsedResult.data) ? parsedResult.data : []
      };

    } catch (error) {
      console.error('Error getting virtual machines:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive"
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        data: []
      };
    }
  }, [connected, executeCommand, toast]);

  const getRestorePoints = useCallback(async (vmName: string): Promise<PowerShellResult<RestorePoint[]>> => {
    if (!connected || !vmName) {
      return { success: false, error: 'Not connected or invalid Server name', data: [] };
    }
  
    try {
      const script = `
        try {
            $ErrorActionPreference = "Stop"
            
            
            Write-Output "Getting restore points for Server: $vmName"
            $points = @()
            
            $backups = Get-VBRBackup | Where-Object {
                $restorePoints = Get-VBRRestorePoint -Backup $_ | Where-Object { $_.Name -eq '${vmName}' }
                return $null -ne $restorePoints
            }
            Write-Output "Found $($backups.Count) backups containing the Server"
            
            foreach ($backup in $backups) {
                Write-Output "Processing backup: $($backup.Name)"
                
                $restorePoints = Get-VBRRestorePoint -Backup $backup | Where-Object { $_.Name -eq '${vmName}' }
                if ($restorePoints) {
                    Write-Output "Found $($restorePoints.Count) restore points in $($backup.Name)"
                    
                    foreach ($point in $restorePoints) {
                        $disks = $point.AuxData.Disks | Where-Object { $_.ExistsInBackup }
                        $totalSize = ($disks | ForEach-Object { 
                            [math]::Round($_.Capacity / 1GB, 2) 
                        } | Measure-Object -Sum).Sum
                        
                        # Determinar tipo basado en IsIncremental
                        $backupType = if ($point.IsIncremental) { "Incremental" } else { "Full" }
                        
                        Write-Output "Backup type detected: $backupType for point: $($point.CreationTime)"
                        
                        $pointInfo = @{
                            Id = $point.Id.ToString()
                            CreationTime = $point.CreationTime.ToString('o')
                            Type = $point.Type.ToString()
                            JobName = $backup.Name
                            Status = "Available"
                            TotalDisks = $disks.Count
                            ProcessedSize = $totalSize
                            IsVerified = $point.IsVerified
                            CompressionRatio = $point.CompressionRatio
                            DedupRatio = $point.DedupRatio
                        }
                        $points += $pointInfo
                    }
                }
            }
            
            Write-Output "STARTJSON"
            @{
                success = $true
                data = @($points | Sort-Object CreationTime -Descending | Select-Object -First 5)
                
            } | ConvertTo-Json -Depth 10 -Compress
            Write-Output "ENDJSON"
        }
        catch {
            Write-Output "STARTJSON"
            @{
                success = $false
                error = $_.Exception.Message
                data = @()
            } | ConvertTo-Json -Compress
            Write-Output "ENDJSON"
        }
      `;
  
      const result = await executeCommand(script);
      const jsonMatch = result.match(/STARTJSON\r?\n([\s\S]*?)\r?\nENDJSON/);
      
      if (!jsonMatch) {
        throw new Error('Invalid response format');
      }
  
      const parsedResult = JSON.parse(jsonMatch[1].trim());
      if (!parsedResult.success) {
        throw new Error(parsedResult.error || 'Failed to get restore points');
      }
  
      return {
        success: true,
        data: parsedResult.data
      };
  
    } catch (error) {
      console.error('Error getting restore points:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: []
      };
    }
  }, [connected, executeCommand, toast]);

  const getVMDisks = useCallback(async (restorePointId: string): Promise<PowerShellResult<VBRDisk[]>> => {
    if (!connected || !restorePointId) {
      return { 
        success: false, 
        error: 'Not connected or invalid restore point ID', 
        data: [] 
      };
    }
  
    try {
      const script = `
        try {
            $ErrorActionPreference = "Stop"
            
            
            $inputGuid = '${restorePointId}'
            $guidObj = [System.Guid]::Parse($inputGuid)
            
            $restorePoint = Get-VBRRestorePoint | Where-Object { $_.Id -eq $guidObj }
            if (-not $restorePoint) {
                throw "Restore point not found with ID: $guidObj"
            }
            
            $disks = @()
            $restorePointDisks = $restorePoint.AuxData.Disks | Where-Object { $_.ExistsInBackup }
            Write-Output "Found $($restorePointDisks.Count) disks in backup"
            
            foreach ($disk in $restorePointDisks) {
                $controllerNumber = $disk.Controller.Number
                $unitNumber = $disk.UnitNumber
                $location = ("SCSI {0}:{1}" -f $controllerNumber, $unitNumber)
                
                $diskInfo = @{
                    Id = "disk-{0}_{1}-{2}" -f $controllerNumber, $unitNumber, $guidObj.ToString('N').Substring(0,8)
                    Name = $disk.FlatFileName -replace '-flat\\.vmdk$', '.vmdk'
                    Label = if ($disk.Label) {
                        $disk.Label
                    } elseif ($disk.IsSystem) {
                        "System Disk"
                    } else {
                        "Hard disk (SCSI $location)"
                    }
                    DiskType = "SCSI"
                    CapacityGB = [math]::Round($disk.Capacity / 1GB, 2)
                    UsedSpaceGB = [math]::Round($disk.UsedSize / 1GB, 2)
                    ExistsInBackup = $true
                    Location = $location
                    IsSystem = $disk.IsSystem
                    VariableName = "disk_{0}_{1}" -f $controllerNumber, $unitNumber
                    Path = $disk.Path
                    Controller = @{
                        Type = "SCSI"
                        Bus = $controllerNumber
                        Unit = $unitNumber
                    }
                    Details = @{
                        ProvisioningType = $disk.ProvisioningType
                        SplitMode = $disk.SplitMode
                        DiskFormat = $disk.DiskFormat
                        Alignment = $disk.Alignment
                    }
                }
                
                $disks += $diskInfo
            }
  
            Write-Output "STARTJSON"
            @{
                success = $true
                data = $disks
                
            } | ConvertTo-Json -Depth 10 -Compress
            Write-Output "ENDJSON"
  
        } catch {
            Write-Error "Error in disk info retrieval: $_"
            Write-Output "STARTJSON"
            @{
                success = $false
                error = $_.Exception.Message
                data = @()
            } | ConvertTo-Json -Compress
            Write-Output "ENDJSON"
        }
      `;
  
      const result = await executeCommand(script);
      const match = result.match(/STARTJSON\r?\n([\s\S]*?)\r?\nENDJSON/);
      
      if (!match) {
        throw new Error('Invalid response format from PowerShell');
      }
  
      const parsedResult = JSON.parse(match[1].trim());
      if (!parsedResult.success) {
        throw new Error(parsedResult.error || 'Failed to get Server disks');
      }
  
      const sortedDisks = sortDisks(parsedResult.data);
  
      return {
        success: true,
        data: sortedDisks
      };
  
    } catch (error) {
      console.error('Error getting Server disks:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: []
      };
    }
  }, [connected, executeCommand]);

  return {
    getVirtualMachines,
    getRestorePoints,
    getVMDisks
  };
}

export default useVScanCommands;