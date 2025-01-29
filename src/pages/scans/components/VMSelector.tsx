import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { MountStatus } from '@/components/ui/mount-status';
import { useToast } from '@/components/ui/use-toast';
import { useSSH } from '@/store/SSHContext';
import { useVScanCommands } from '@/hooks/usevscanCommands';
import { useVScanMount } from '@/hooks/usevscanMount';
import { cn } from "@/lib/utils";
import { 
  Search, 
  Server, 
  Calendar, 
  HardDrive, 
  AlertCircle, 
  Trash2
} from 'lucide-react';
import type { SelectedVM, LinuxServerConfig } from '@/types/vscan';

interface VMSelectorProps {
  vbrServer: string;
  selectedItems: SelectedVM[];
  onSaveSelection: (selection: SelectedVM) => void;
  onRemoveItem?: (index: number) => void;
  onMountComplete?: (success: boolean, mountInfo?: SelectedVM) => void;
  disabled?: boolean;
  onStartScan?: () => Promise<void>;
}

export default function VMSelector({
  vbrServer,
  selectedItems,
  onSaveSelection,
  onRemoveItem,
  onMountComplete,
  disabled = false
}: VMSelectorProps) {
  const { toast } = useToast();
  const { isConnected: sshConnected, connectedServer } = useSSH();
  const { getVirtualMachines, getRestorePoints, getVMDisks } = useVScanCommands();
  const { mountDisks, unmountDisks, mountState, clearLogs } = useVScanMount();
  
  const [selectedVM, setSelectedVM] = useState<string>('');
  const [selectedRestorePoint, setSelectedRestorePoint] = useState<string>('');
  const [selectedDisks, setSelectedDisks] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isMounting, setIsMounting] = useState(false);
  const [isUnmounting, setIsUnmounting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasCheckedConfig, setHasCheckedConfig] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      try {        
        await new Promise(resolve => setTimeout(resolve, 1500));

        const stored = localStorage.getItem('linux-server-config');
        if (stored) {
          const config = JSON.parse(stored) as LinuxServerConfig;
          if (config.serverType && 
              ((config.serverType === 'vbr' && config.vbrServer?.name) ||
               (config.serverType === 'manual' && config.manualServer?.address)) &&
              config.credentials?.username) {
            setHasCheckedConfig(true);
          }
        }
      } catch (error) {
        console.error('Error loading config:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    loadConfig();
  }, []);
  
  const { data: virtualMachines, isLoading: isLoadingVMs } = useQuery({
    queryKey: ['virtualMachines', vbrServer, searchTerm],
    queryFn: () => getVirtualMachines(searchTerm),
    enabled: Boolean(vbrServer)
  });
  
  const { data: restorePoints } = useQuery({
    queryKey: ['restorePoints', selectedVM],
    queryFn: () => getRestorePoints(selectedVM),
    enabled: Boolean(selectedVM)
  });
  
  const { data: disks, isLoading: isLoadingDisks } = useQuery({
    queryKey: ['disks', selectedRestorePoint],
    queryFn: () => getVMDisks(selectedRestorePoint),
    enabled: Boolean(selectedRestorePoint)
  });

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked && disks?.data) {
      setSelectedDisks(disks.data.map(disk => disk.Id));
    } else {
      setSelectedDisks([]);
    }
  }, [disks?.data]);

  const handleClearSelection = useCallback(() => {
    setSelectedVM('');
    setSelectedRestorePoint('');
    setSelectedDisks([]);
    setSearchTerm('');
  }, []);

  const handleAddToQueue = useCallback(() => {
    if (!selectedVM || !selectedRestorePoint || !disks?.data || selectedDisks.length === 0) return;

    const selectedDiskDetails = disks.data
      .filter(disk => selectedDisks.includes(disk.Id))
      .map(disk => ({
        id: disk.Id,
        name: disk.Name,
        location: disk.Location,
        capacityGB: disk.CapacityGB || 0,
        variableName: disk.VariableName
      }));

    onSaveSelection({
      vmName: selectedVM,
      restorePointId: selectedRestorePoint,
      selectedDisks: selectedDiskDetails
    });

    setSelectedDisks([]);
    toast({
      variant: "success",
      title: 'Added to Queue',
      description: `Added ${selectedVM} with ${selectedDiskDetails.length} disk(s)`,
    });
  }, [selectedVM, selectedRestorePoint, disks?.data, selectedDisks, onSaveSelection, toast]);

  const handleMount = useCallback(async () => {
    if (mountState.isProcessing || selectedItems.length === 0) return;
  
    setIsMounting(true);
    try {
      const success = await mountDisks(selectedItems);
      if (success) {
        toast({
          variant: "success",
          title: "Mount Success",
          description: `Successfully mounted disks for ${selectedItems.length} Server(s)`,
        });
  
        const firstItem = selectedItems[0];
        if (onMountComplete && firstItem) {
          const mountInfo: SelectedVM = {
            vmName: firstItem.vmName,
            restorePointId: firstItem.restorePointId,
            selectedDisks: firstItem.selectedDisks.map(disk => ({
              ...disk,
              mountPath: mountState.sessions[firstItem.vmName]?.mountPoints?.[0]?.mountPath || disk.mountPath
            })),
            mountPath: mountState.sessions[firstItem.vmName]?.mountPoints?.[0]?.mountPath
          };
          onMountComplete(true, mountInfo);
        }
      }
    } catch (error) {
      console.error('Mount error:', error);
      toast({
        title: "Mount Failed",
        description: error instanceof Error ? error.message : 'Failed to mount disks',
        variant: "destructive"
      });
      if (onMountComplete) {
        onMountComplete(false);
      }
    } finally {
      setIsMounting(false);
    }
  }, [selectedItems, mountDisks, mountState.sessions, mountState.isProcessing, toast, onMountComplete]);

  const handleGlobalUnmount = useCallback(async () => {
    if (isUnmounting || !mountState.sessions) return;

    setIsUnmounting(true);
    try {
      const promises = selectedItems.map(item => unmountDisks(item.vmName));
      const results = await Promise.all(promises);

      const allSuccess = results.every(success => success);
      if (allSuccess) {
        toast({
          variant: "success",
          title: "Unmount Success",
          description: "Successfully unmounted all disks",
        });

        if (onRemoveItem) {
          selectedItems.forEach((_, index) => onRemoveItem(index));
        }
      } else {
        throw new Error("Some disks failed to unmount");
      }
    } catch (error) {
      console.error('Unmount error:', error);
      toast({
        title: "Unmount Failed",
        description: error instanceof Error ? error.message : 'Failed to unmount disks',
        variant: "destructive"
      });
    } finally {
      setIsUnmounting(false);
    }
  }, [isUnmounting, mountState.sessions, selectedItems, unmountDisks, onRemoveItem, toast]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatSize = useCallback((sizeInGB: number | undefined | null): string => {
    const size = typeof sizeInGB === 'number' && !isNaN(sizeInGB) ? sizeInGB : 0;
    
    if (size < 1) {
      return `${Math.round(size * 1024)} MB`;
    }
    return `${Math.round(size)} GB`;
  }, []);

  const areAllDisksSelected = disks?.data && 
    disks.data.length > 0 && 
    selectedDisks.length === disks.data.length;
  
  const filteredVMs = virtualMachines?.data
    ?.filter(vm => vm.Name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.Name.localeCompare(b.Name));

  const showUnmountButton = mountState.canStartScan && Object.keys(mountState.sessions || {}).length > 0;

  const showConfigWarning = !isInitializing && 
                           hasCheckedConfig && 
                           (!sshConnected || !connectedServer);

                           return (
                            <Card>
                              {showConfigWarning && (
                                <div className="p-4 mb-4 border-yellow-200 bg-yellow-50">
                                  <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Configuration Required</AlertTitle>
                                    <AlertDescription>
                                      Please configure a Linux server in Settings before mounting disks
                                    </AlertDescription>
                                  </Alert>
                                </div>
                              )}

      <div className="grid grid-cols-4 gap-4 p-6">        
        <div>
          <h3 className="font-medium mb-2 flex items-center gap-2">
            <Server className="w-4 h-4" />
            SEARCH / SELECT SERVER
          </h3>
          <Select
            value={selectedVM}
            onValueChange={(value) => {
              setSelectedVM(value);
              setSelectedRestorePoint('');
              setSelectedDisks([]);
            }}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder={isLoadingVMs ? "Loading VMs..." : "Select Server"} />
            </SelectTrigger>
            <SelectContent>
              <div className="p-2">
                <div className="relative mb-2">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search Servers..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-8"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
              <ScrollArea className="h-[200px]">
                {isLoadingVMs ? (
                  <div className="py-2 px-4 text-center">
                    <LoadingSpinner text="Loading VMs..." />
                  </div>
                ) : !filteredVMs?.length ? (
                  <div className="py-2 px-4 text-center text-gray-500">
                    {searchTerm ? `No VMs found matching "${searchTerm}"` : 'No VMs available'}
                  </div>
                ) : (
                  filteredVMs.map(vm => (
                    <SelectItem key={vm.Id} value={vm.Name}>
                      <div className="flex flex-col">
                        <span className="font-medium">{vm.Name}</span>
                        <span className="text-xs text-gray-500">
                          Last backup: {vm.LastBackupDate ? formatDate(vm.LastBackupDate) : 'Never'}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </ScrollArea>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <h3 className="font-medium mb-2 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            RESTORE POINT
          </h3>
          <Select
            value={selectedRestorePoint}
            onValueChange={(value) => {
              setSelectedRestorePoint(value);
              setSelectedDisks([]);
            }}
            disabled={!selectedVM || disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Restore Point" />
            </SelectTrigger>
            <SelectContent>
              <ScrollArea className="h-[200px]">
                {restorePoints?.data
                  ?.sort((a, b) => new Date(b.CreationTime).getTime() - new Date(a.CreationTime).getTime())
                  .slice(0, 5)
                  .map((point, index) => (
                    <SelectItem 
                      key={`restore-point-${point.Id}-${index}`} 
                      value={point.Id}
                      className="py-2"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="font-medium">
                          {formatDate(point.CreationTime)}
                        </div>
                        <div className="text-xs text-gray-500">
                          <div>Type: {point.Type}</div>
                          {point.JobName && <div>Job: {point.JobName}</div>}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
              </ScrollArea>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium flex items-center gap-2">
              <HardDrive className="w-4 h-4" />
              SELECT DISK
            </h3>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={areAllDisksSelected}
                onCheckedChange={handleSelectAll}
                disabled={!selectedRestorePoint || isLoadingDisks || disabled}
              />
              <Label htmlFor="select-all">Select All</Label>
            </div>
          </div>
          <ScrollArea className="h-[300px] border rounded-lg p-4">
            {isLoadingDisks ? (
              <div className="flex items-center justify-center h-full">
                <LoadingSpinner text="Loading disks..." />
              </div>
            ) : !selectedRestorePoint ? (
              <div className="text-center text-gray-500">
                Select a restore point first
              </div>
            ) : !disks?.data || disks.data.length === 0 ? (
              <div className="text-center text-gray-500">
                No disks available
              </div>
            ) : (
              disks.data.map((disk) => (
                <label
                  key={disk.Id}
                  className="flex items-start space-x-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
                >
                  <Checkbox
                    checked={selectedDisks.includes(disk.Id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedDisks(prev => [...prev, disk.Id]);
                      } else {
                        setSelectedDisks(prev => prev.filter(id => id !== disk.Id));
                      }
                    }}
                    disabled={disabled}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{disk.Label}</span>
                    <div className="text-xs text-gray-500">
                      <div>Name: {disk.Name}</div>
                      <div>Location: {disk.Location}</div>
                      <div>Size: {formatSize(disk.CapacityGB ?? 0)}</div>
                      <div>Variable: {disk.VariableName}</div>
                      {disk.IsSystem && (
                        <div className="text-blue-600 font-medium">System Disk</div>
                      )}
                    </div>
                  </div>
                </label>
              ))
            )}
          </ScrollArea>
        </div>
        
        <div>
          <h3 className="font-medium mb-2">QUEUE</h3>
          <ScrollArea className="h-[300px] border rounded-lg p-4">
            {selectedItems.length === 0 ? (
              <div className="text-center text-gray-500">
                No items in queue
              </div>
            ) : (
              <div className="space-y-4">
                {selectedItems.map((item, index) => (
                  <div key={`${item.vmName}-${index}`} className="relative border-b pb-2 last:border-b-0">
                    <div className="flex justify-between items-start group">
                      <div className="flex-1">
                        <div className="font-medium">{item.vmName}</div>
                        <div className="text-sm text-gray-600">
                          Selected disks: {item.selectedDisks.length}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {item.selectedDisks.map((disk, diskIndex) => (
                            <div key={diskIndex}>
                              {disk.name} ({disk.location}) - {formatSize(disk.capacityGB)}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {onRemoveItem && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRemoveItem(index)}
                            className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            disabled={disabled || mountState.isProcessing}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
      
      <div className="flex justify-between p-4 border-t">
        <Button
          variant="outline"
          onClick={handleClearSelection}
          className={cn(
            "text-gray-600 hover:text-red-600",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
          disabled={
            disabled ||
            mountState.isProcessing ||
            (selectedItems.length === 0 && !selectedVM && !selectedRestorePoint && selectedDisks.length === 0)
          }
        >
          Clear All
        </Button>
        <div className="space-x-2">
          <Button
            onClick={handleAddToQueue}
            disabled={
              disabled ||
              !selectedVM ||
              !selectedRestorePoint ||
              selectedDisks.length === 0 ||
              mountState.isProcessing
            }
            className={cn(
              "transition-colors",
              selectedVM && selectedRestorePoint && selectedDisks.length > 0 && !disabled
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-gray-100 text-gray-400"
            )}
          >
            Add to Queue
          </Button>
          
          <Button
            variant="secondary"
            onClick={handleMount}
            disabled={
              disabled ||
              selectedItems.length === 0 ||
              mountState.isProcessing ||
              !sshConnected ||
              isMounting
            }
            className={cn(
              "transition-colors min-w-[120px]",
              mountState.isProcessing || isMounting
                ? "bg-blue-100 text-blue-400"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            )}
          >
            {isMounting ? (
              <div className="flex items-center gap-2">
                <LoadingSpinner className="w-4 h-4" />
                <span>Mounting...</span>
              </div>
            ) : (
              <>Mount {selectedItems.length > 0 ? `(${selectedItems.length})` : 'Disks'}</>
            )}
          </Button>

          {showUnmountButton && (
            <Button
              variant="destructive"
              onClick={handleGlobalUnmount}
              disabled={isUnmounting || disabled}
              className="min-w-[120px]"
            >
              {isUnmounting ? (
                <div className="flex items-center gap-2">
                  <LoadingSpinner className="w-4 h-4" />
                  <span>Unmounting...</span>
                </div>
              ) : (
                'Unmount All'
              )}
            </Button>
          )}
        </div>
      </div>
      
      {(mountState.isProcessing || mountState.logs.length > 0 || mountState.error) && (
        <div className="border-t p-4 bg-gray-50">
          <MountStatus
            logs={mountState.logs}
            onClearLogs={clearLogs}
            status={mountState.error || ''}
            phase={mountState.currentPhase}
            className="font-mono text-sm"
            autoScroll={true}
            formatLog={(log: string) => {              
              if (log.includes('=== Starting')) {
                return <div className="text-blue-600 font-bold mt-2">{log}</div>;
              }
              if (log.includes('Mount point created:')) {
                return <div className="text-green-600 ml-4">{log}</div>;
              }
              if (log.includes('Error')) {
                return <div className="text-red-600">{log}</div>;
              }
              return <div className="text-gray-700 ml-2">{log}</div>;
            }}
          />
        </div>
      )}
    </Card>
  );
}