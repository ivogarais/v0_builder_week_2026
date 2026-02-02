'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, FileText, Mail, CheckCircle, XCircle, Loader2, ExternalLink } from 'lucide-react';

interface Integration {
  id: string;
  type: string;
  enabled: boolean;
  last_sync_at: string | null;
}

interface IntegrationStatus {
  integrations: Integration[];
  google: {
    connected: boolean;
    expired: boolean;
  };
}

const INTEGRATION_INFO = {
  google_calendar: {
    name: 'Google Calendar',
    description: 'View and manage your calendar events',
    icon: Calendar,
  },
  google_drive: {
    name: 'Google Drive',
    description: 'Search and read files from your Drive',
    icon: FileText,
  },
  google_gmail: {
    name: 'Gmail',
    description: 'Read and send emails',
    icon: Mail,
  },
};

export default function IntegrationsPage() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  async function fetchStatus() {
    try {
      const res = await fetch('/api/integrations');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
    } finally {
      setLoading(false);
    }
  }

  async function connectGoogle() {
    window.location.href = '/api/auth/google';
  }

  async function disconnectGoogle() {
    if (!confirm('Disconnect Google? This will disable Calendar, Drive, and Gmail integrations.')) {
      return;
    }

    setDisconnecting(true);
    try {
      const res = await fetch('/api/integrations', { method: 'DELETE' });
      if (res.ok) {
        await fetchStatus();
      }
    } catch (error) {
      console.error('Failed to disconnect:', error);
    } finally {
      setDisconnecting(false);
    }
  }

  async function toggleIntegration(type: string, enabled: boolean) {
    try {
      await fetch('/api/integrations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, enabled }),
      });
      await fetchStatus();
    } catch (error) {
      console.error('Failed to toggle integration:', error);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/chat"
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">Integrations</h1>
        </div>

        {/* Google Connection Card */}
        <div className="mb-8 p-6 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#4285f4] flex items-center justify-center">
                <svg className="h-6 w-6 text-white" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold">Google Account</h2>
                <p className="text-sm text-muted-foreground">
                  {status?.google.connected
                    ? 'Connected - Calendar, Drive, and Gmail access enabled'
                    : 'Connect to enable Google integrations'}
                </p>
              </div>
            </div>
            {status?.google.connected ? (
              <button
                onClick={disconnectGoogle}
                disabled={disconnecting}
                className="px-4 py-2 text-sm rounded-lg border border-destructive text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
              >
                {disconnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Disconnect'
                )}
              </button>
            ) : (
              <button
                onClick={connectGoogle}
                className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Connect Google
              </button>
            )}
          </div>
        </div>

        {/* Individual Integrations */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Services</h3>

          {Object.entries(INTEGRATION_INFO).map(([type, info]) => {
            const integration = status?.integrations.find((i) => i.type === type);
            const Icon = info.icon;
            const isEnabled = integration?.enabled && status?.google.connected;

            return (
              <div
                key={type}
                className="p-4 rounded-xl border border-border bg-card flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                  <Icon className="h-5 w-5 text-foreground" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{info.name}</h4>
                    {isEnabled ? (
                      <CheckCircle className="h-4 w-4 text-primary" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{info.description}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    disabled={!status?.google.connected}
                    onChange={(e) => toggleIntegration(type, e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-primary peer-disabled:opacity-50 peer-disabled:cursor-not-allowed transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                </label>
              </div>
            );
          })}
        </div>

        {!status?.google.connected && (
          <div className="mt-8 p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm text-muted-foreground text-center">
              Connect your Google account to enable Calendar, Drive, and Gmail integrations.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
