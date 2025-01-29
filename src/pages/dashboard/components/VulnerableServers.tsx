import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';

interface VulnerableServer {
  name: string;
  vulnerabilities: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  total: number;
}

interface VulnerableServersProps {
  servers: VulnerableServer[];
}

export function VulnerableServers({ servers }: VulnerableServersProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <ShieldAlert className="h-5 w-5" />
          Most Vulnerable Servers
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {servers.slice(0, 10).map((server) => (
            <div key={server.name} className="relative flex items-center gap-4 group">
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="relative h-full">
                  <div 
                    className="absolute h-full bg-red-500"
                    style={{
                      width: `${(server.vulnerabilities.critical/server.total)*100}%`
                    }}
                    title={`Critical: ${server.vulnerabilities.critical}`}
                  />
                  <div 
                    className="absolute h-full bg-orange-500"
                    style={{
                      width: `${(server.vulnerabilities.high/server.total)*100}%`,
                      left: `${(server.vulnerabilities.critical/server.total)*100}%`
                    }}
                    title={`High: ${server.vulnerabilities.high}`}
                  />
                  <div 
                    className="absolute h-full bg-yellow-500"
                    style={{
                      width: `${(server.vulnerabilities.medium/server.total)*100}%`,
                      left: `${((server.vulnerabilities.critical + server.vulnerabilities.high)/server.total)*100}%`
                    }}
                    title={`Medium: ${server.vulnerabilities.medium}`}
                  />
                  <div 
                    className="absolute h-full bg-green-500"
                    style={{
                      width: `${(server.vulnerabilities.low/server.total)*100}%`,
                      left: `${((server.vulnerabilities.critical + server.vulnerabilities.high + server.vulnerabilities.medium)/server.total)*100}%`
                    }}
                    title={`Low: ${server.vulnerabilities.low}`}
                  />
                </div>
              </div>
              <div className="w-32 flex justify-between">
                <span className="text-sm font-medium">{server.name}</span>
                <span className="text-sm text-gray-500">({server.total})</span>
              </div>
              
              <div className="absolute -top-20 left-0 invisible group-hover:visible bg-white p-2 rounded-lg shadow-lg border text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span>Critical: {server.vulnerabilities.critical}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                  <span>High: {server.vulnerabilities.high}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                  <span>Medium: {server.vulnerabilities.medium}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span>Low: {server.vulnerabilities.low}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}