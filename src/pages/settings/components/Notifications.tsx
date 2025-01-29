import React, { useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Mail, Send, Server } from 'lucide-react';

interface SMTPConfig {
  server: string;
  port: number;
  senderEmail: string;
  senderName: string;
  username: string;
  password: string;
  emailTo: string;
  useSSL: boolean;
}

const defaultConfig: SMTPConfig = {
  server: '',
  port: 587,
  senderEmail: '',
  senderName: '',
  username: '',
  password: '',
  emailTo: '',
  useSSL: true,
};

export default function NotificationsConfig() {
  const { toast } = useToast();
  const [config, setConfig] = React.useState<SMTPConfig>(defaultConfig);
  const [isTesting, setIsTesting] = React.useState(false);
  
  const { data: existingConfig, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['smtp-config'],
    queryFn: async () => {
      const response = await fetch('/api/notifications/config');
      const data = await response.json();
      return data.success ? data.config : null;
    }
  });
  
  useEffect(() => {
    if (existingConfig) {
      console.log('Loading existing config:', existingConfig);
      setConfig(prev => ({
        ...prev,
        ...existingConfig,
        port: existingConfig.port || prev.port,
        useSSL: existingConfig.useSSL === true  
      }));
    }
  }, [existingConfig]);
  
  const testEmailMutation = useMutation({
    mutationFn: async (testConfig: SMTPConfig) => {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testConfig)
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to send test email');
      }
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Test email sent",
        description: "Check your inbox for the test email",
      });
      setIsTesting(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send test email",
        description: error.message,
        variant: "destructive",
      });
      setIsTesting(false);
    },
  });
  
  const saveConfigMutation = useMutation({
    mutationFn: async (config: SMTPConfig) => {
      const response = await fetch('/api/notifications/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to save configuration');
      }
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Settings saved",
        description: "Email notification settings have been saved successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTestEmail = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsTesting(true);
    testEmailMutation.mutate(config);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    saveConfigMutation.mutate(config);
  };

  const validateForm = (): boolean => {
    return !!(config.server && config.senderEmail && config.emailTo && 
              config.username && config.password);
  };

  if (isLoadingConfig) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-48">
          <LoadingSpinner text="Loading settings..." />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-lg font-medium flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Notifications
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure email notifications for scan results and alerts
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">          
          <div className="space-y-2">
            <Label htmlFor="smtp-server" className="flex gap-2 items-center">
              <Server className="h-4 w-4" />
              SMTP Server
            </Label>
            <Input
              id="smtp-server"
              value={config.server}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                server: e.target.value
              }))}
              placeholder="smtp.example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="smtp-port">Port</Label>
            <Input
              id="smtp-port"
              type="number"
              value={config.port}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                port: parseInt(e.target.value) || 587
              }))}
              placeholder="587"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="sender-email">Sender Email</Label>
            <Input
              id="sender-email"
              type="email"
              value={config.senderEmail}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                senderEmail: e.target.value
              }))}
              placeholder="sender@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sender-name">Sender Name</Label>
            <Input
              id="sender-name"
              value={config.senderName}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                senderName: e.target.value
              }))}
              placeholder="vScan Security Scanner"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={config.username}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                username: e.target.value
              }))}
              placeholder="SMTP username"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={config.password}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                password: e.target.value
              }))}
              placeholder="SMTP password"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email-to">Recipients</Label>
            <Input
              id="email-to"
              type="email"
              value={config.emailTo}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                emailTo: e.target.value
              }))}
              placeholder="recipient@example.com"
              required
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="use-ssl"
              checked={config.useSSL === true}
              onCheckedChange={(checked) => {
                console.log('SSL checkbox changed:', checked);
                setConfig(prev => ({
                  ...prev,
                  useSSL: checked === true
                }));
              }}
            />
            <Label 
              htmlFor="use-ssl" 
              className="font-normal cursor-pointer"
            >
              Use SSL/TLS
            </Label>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleTestEmail}
            disabled={isTesting || !validateForm() || testEmailMutation.isPending}
            className="gap-2"
          >
            {isTesting ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send Test Email
          </Button>

          <Button
            type="submit"
            disabled={!validateForm() || saveConfigMutation.isPending}
            className="gap-2"
          >
            {saveConfigMutation.isPending ? (
              <LoadingSpinner size="sm" />
            ) : (
              "Save Settings"
            )}
          </Button>
        </div>
        
        {(testEmailMutation.isError || saveConfigMutation.isError) && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
            {testEmailMutation.error?.message || saveConfigMutation.error?.message}
          </div>
        )}
      </form>
    </Card>
  );
}