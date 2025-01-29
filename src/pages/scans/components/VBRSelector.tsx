import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useVScan } from '@/store/vscan-context';

interface VBRSelectorProps {
  selectedVBR: string;
  onSelectVBR: (vbr: string) => void;
  disabled?: boolean;
}

export default function VBRSelector({ selectedVBR, onSelectVBR }: VBRSelectorProps) {
  const { connected, serverInfo } = useVScan();

  return (
    <Card className="p-6">
      {!connected ? (
        <div className="text-sm text-yellow-600">
          Please connect to a VBR server in Settings first
        </div>
      ) : (
        <Select 
          value={selectedVBR} 
          onValueChange={onSelectVBR}
          defaultValue={serverInfo?.server}
        >
          <SelectTrigger>
            <SelectValue placeholder="SELECT VBR" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={serverInfo?.server || ''}>
              {serverInfo?.server}
            </SelectItem>
          </SelectContent>
        </Select>
      )}
    </Card>
  );
}