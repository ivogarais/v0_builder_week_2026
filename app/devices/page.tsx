'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Smartphone, QrCode, Trash2, Loader2, RefreshCw } from 'lucide-react';

interface PairedDevice {
  id: string;
  name: string;
  paired_at: string;
}

interface PairingCode {
  code: string;
  expires_at: string;
  qr_data: string;
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<PairedDevice[]>([]);
  const [pairingCode, setPairingCode] = useState<PairingCode | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    fetchDevices();
  }, []);

  async function fetchDevices() {
    try {
      const res = await fetch('/api/pairing/devices');
      if (res.ok) {
        const data = await res.json();
        setDevices(data.devices || []);
      }
    } catch (error) {
      console.error('Failed to fetch devices:', error);
    } finally {
      setLoading(false);
    }
  }

  async function generatePairingCode() {
    setGenerating(true);
    try {
      const res = await fetch('/api/pairing');
      if (res.ok) {
        const data = await res.json();
        setPairingCode(data);
        startPolling(data.code);
      }
    } catch (error) {
      console.error('Failed to generate pairing code:', error);
    } finally {
      setGenerating(false);
    }
  }

  const startPolling = useCallback((code: string) => {
    setPolling(true);
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/pairing/status?code=${code}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'used') {
            clearInterval(interval);
            setPolling(false);
            setPairingCode(null);
            await fetchDevices();
          } else if (data.status === 'expired') {
            clearInterval(interval);
            setPolling(false);
            setPairingCode(null);
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 2000);

    // Stop polling after 5 minutes
    setTimeout(() => {
      clearInterval(interval);
      setPolling(false);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  async function unpairDevice(id: string) {
    if (!confirm('Unpair this device?')) return;

    try {
      const res = await fetch(`/api/pairing/devices?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDevices((prev) => prev.filter((d) => d.id !== id));
      }
    } catch (error) {
      console.error('Failed to unpair device:', error);
    }
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
          <h1 className="text-2xl font-bold">Paired Devices</h1>
        </div>

        {/* Pairing Section */}
        <div className="mb-8 p-6 rounded-xl border border-border bg-card">
          <h2 className="text-lg font-semibold mb-4">Pair a New Device</h2>

          {pairingCode ? (
            <div className="text-center">
              <div className="inline-flex flex-col items-center p-6 rounded-xl bg-white mb-4">
                {/* Simple QR placeholder - in production, use a QR library */}
                <div className="w-48 h-48 bg-muted flex items-center justify-center rounded-lg mb-4">
                  <QrCode className="h-24 w-24 text-muted-foreground" />
                </div>
                <p className="text-4xl font-mono font-bold tracking-wider text-foreground">
                  {pairingCode.code}
                </p>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Scan the QR code or enter the code on your other device
              </p>
              <p className="text-xs text-muted-foreground">
                Code expires at {new Date(pairingCode.expires_at).toLocaleTimeString()}
              </p>
              {polling && (
                <div className="flex items-center justify-center gap-2 mt-4 text-primary">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Waiting for pairing...</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                Generate a pairing code to connect your phone or other device
              </p>
              <button
                onClick={generatePairingCode}
                disabled={generating}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {generating ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <QrCode className="h-5 w-5" />
                )}
                Generate Pairing Code
              </button>
            </div>
          )}
        </div>

        {/* Paired Devices List */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Your Devices</h3>

          {devices.length === 0 ? (
            <div className="p-8 rounded-xl border border-dashed border-border text-center">
              <Smartphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No devices paired yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className="p-4 rounded-xl border border-border bg-card flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                    <Smartphone className="h-5 w-5 text-foreground" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{device.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      Paired {formatDate(device.paired_at)}
                    </p>
                  </div>
                  <button
                    onClick={() => unpairDevice(device.id)}
                    className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-5 w-5 text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
