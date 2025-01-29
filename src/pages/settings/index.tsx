import { Settings as SettingsIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import VBRConfig from './components/VBRConfig';
import LinuxScanner from './components/LinuxScanner';
import Notifications from './components/Notifications';

export default function Settings() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <SettingsIcon className="h-5 w-5" />
            Settings
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage VBR connections and scanner settings
          </p>
        </div>
      </div>

      <Tabs defaultValue="vbr">
        <TabsList className="w-full bg-gray-100 p-1">
          <TabsTrigger value="vbr" className="flex-1">
            VBR CONFIG
          </TabsTrigger>
          <TabsTrigger value="linux" className="flex-1">
            LINUX SCANNER
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex-1">
            NOTIFICATIONS
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vbr">
          <VBRConfig />
        </TabsContent>

        <TabsContent value="linux">
          <LinuxScanner />
        </TabsContent>

        <TabsContent value="notifications">
          <Notifications />
        </TabsContent>
      </Tabs>
    </div>
  );
}