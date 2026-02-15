"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, CheckCircle, XCircle, Loader2, Trash2, ExternalLink, Save, Copy, Check, Upload } from "lucide-react";
import { useCalendarSources } from "@/hooks/useCalendarSources";
import type { CalendarPlatform, CalendarSource } from "@/types";

const PLATFORMS: { key: CalendarPlatform; label: string; color: string; bg: string }[] = [
  { key: "airbnb", label: "Airbnb", color: "text-rose-700", bg: "bg-rose-50 border-rose-200" },
  { key: "booking", label: "Booking.com", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
];

// ─── Mock mode row (no Supabase) ─────────────────────────────
interface MockSource {
  platform: CalendarPlatform;
  url: string;
  savedAt: string | null;
}

function MockPlatformRow({ platform, source, onSave, onDelete }: {
  platform: typeof PLATFORMS[number];
  source: MockSource | undefined;
  onSave: (url: string) => void;
  onDelete: () => void;
}) {
  const [url, setUrl] = useState(source?.url || "");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setUrl(source?.url || "");
  }, [source?.url]);

  const dirty = url !== (source?.url || "");

  function handleSave() {
    if (!url.trim()) return;
    onSave(url.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${platform.bg}`}>
      <div className="flex items-center justify-between">
        <span className={`text-sm font-semibold ${platform.color}`}>{platform.label}</span>
        {source?.savedAt && (
          <div className="flex items-center gap-1.5">
            <CheckCircle size={13} className="text-emerald-500" />
            <span className="text-xs text-stone-500">Sauvegardé</span>
          </div>
        )}
      </div>

      <input
        type="url"
        value={url}
        onChange={(e) => { setUrl(e.target.value); setSaved(false); }}
        placeholder={`URL iCal ${platform.label}...`}
        className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:border-transparent"
      />

      <div className="flex items-center gap-2 flex-wrap">
        {dirty && url.trim() && (
          <button onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-stone-900 text-white hover:bg-stone-800 transition-colors">
            <Save size={12} /> Enregistrer
          </button>
        )}
        {source?.url && (
          <button onClick={onDelete}
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-red-600 hover:bg-red-50 transition-colors"
            title="Supprimer">
            <Trash2 size={12} />
          </button>
        )}
        {saved && (
          <span className="text-xs text-emerald-600 font-medium">URL enregistrée</span>
        )}
      </div>

      <p className="text-[11px] text-stone-400 leading-relaxed">
        La synchronisation automatique sera active une fois Supabase configuré. En attendant, les URLs sont sauvegardées localement.
      </p>
    </div>
  );
}

// ─── Live mode row (with Supabase) ───────────────────────────
function LivePlatformRow({ platform, source, onSave, onTest, onSync, onDelete, onToggleAutoSync, onChangeInterval, isSyncing, isTesting }: {
  platform: typeof PLATFORMS[number];
  source: CalendarSource | undefined;
  onSave: (url: string) => Promise<void>;
  onTest: (url: string) => Promise<void>;
  onSync: () => Promise<void>;
  onDelete: () => Promise<void>;
  onToggleAutoSync: (autoSync: boolean) => Promise<void>;
  onChangeInterval: (hours: number) => Promise<void>;
  isSyncing: boolean;
  isTesting: boolean;
}) {
  const [url, setUrl] = useState(source?.ical_url || "");
  const [testResult, setTestResult] = useState<{ valid: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setUrl(source?.ical_url || "");
  }, [source?.ical_url]);

  const dirty = url !== (source?.ical_url || "");

  async function handleTest() {
    if (!url.trim()) return;
    setTestResult(null);
    setError(null);
    try {
      await onTest(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }

  async function handleSave() {
    if (!url.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  function formatSyncDate(iso: string | null): string {
    if (!iso) return "Jamais";
    return new Date(iso).toLocaleString("fr-CH", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    });
  }

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${platform.bg}`}>
      <div className="flex items-center justify-between">
        <span className={`text-sm font-semibold ${platform.color}`}>{platform.label}</span>
        <div className="flex items-center gap-2">
          {source && (
            <>
              {source.last_sync_status === "success" && <CheckCircle size={14} className="text-emerald-500" />}
              {source.last_sync_status === "error" && <XCircle size={14} className="text-red-500" />}
              {source.last_sync_status === "pending" && <Loader2 size={14} className="text-amber-500 animate-spin" />}
              <span className="text-xs text-stone-500">{formatSyncDate(source.last_synced_at)}</span>
            </>
          )}
        </div>
      </div>

      <input
        type="url"
        value={url}
        onChange={(e) => { setUrl(e.target.value); setTestResult(null); setError(null); }}
        placeholder={`URL iCal ${platform.label}...`}
        className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:border-transparent"
      />

      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={handleTest} disabled={!url.trim() || isTesting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          {isTesting ? <Loader2 size={12} className="animate-spin" /> : <ExternalLink size={12} />}
          Tester
        </button>
        {dirty && (
          <button onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-40 transition-colors">
            {saving ? <Loader2 size={12} className="animate-spin" /> : null}
            Enregistrer
          </button>
        )}
        {source && (
          <>
            <button onClick={onSync} disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-stone-700 text-white hover:bg-stone-600 disabled:opacity-40 transition-colors">
              <RefreshCw size={12} className={isSyncing ? "animate-spin" : ""} />
              Synchroniser
            </button>
            <button onClick={onDelete}
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-red-600 hover:bg-red-50 transition-colors"
              title="Supprimer">
              <Trash2 size={12} />
            </button>
          </>
        )}
      </div>

      {testResult && (
        <div className={`text-xs px-3 py-2 rounded-lg ${testResult.valid ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {testResult.message}
        </div>
      )}
      {error && (
        <div className="text-xs px-3 py-2 rounded-lg bg-red-50 text-red-700">{error}</div>
      )}
      {source?.last_sync_message && !testResult && !error && (
        <div className={`text-xs px-3 py-2 rounded-lg ${source.last_sync_status === "error" ? "bg-red-50 text-red-700" : "bg-stone-100 text-stone-600"}`}>
          {source.last_sync_message}
        </div>
      )}
      {source?.last_error && source.last_sync_status !== "error" && (
        <div className="text-xs px-3 py-2 rounded-lg bg-red-50 text-red-700">
          Dernière erreur : {source.last_error}
        </div>
      )}
      {source && (
        <div className="flex items-center gap-3 pt-1 border-t border-stone-200/60">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={source.auto_sync || false}
              onChange={(e) => onToggleAutoSync(e.target.checked)}
              className="rounded border-stone-300 text-amber-500 focus:ring-amber-400"
            />
            <span className="text-xs text-stone-600">Auto-sync</span>
          </label>
          {source.auto_sync && (
            <select
              value={source.sync_interval_hours || 6}
              onChange={(e) => onChangeInterval(parseInt(e.target.value))}
              className="text-xs px-2 py-1 rounded-lg border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/50"
            >
              <option value={1}>Toutes les heures</option>
              <option value={3}>Toutes les 3h</option>
              <option value={6}>Toutes les 6h</option>
              <option value={12}>Toutes les 12h</option>
              <option value={24}>Toutes les 24h</option>
            </select>
          )}
        </div>
      )}
    </div>
  );
}

// ─── iCal Export Section ─────────────────────────────────────
function ICalExportBlock({ propertyId }: { propertyId: string }) {
  const [copied, setCopied] = useState(false);
  const exportUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/ical-export/${propertyId}`
    : `/api/ical-export/${propertyId}`;

  function handleCopy() {
    navigator.clipboard.writeText(exportUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Upload size={14} className="text-amber-600" />
        <span className="text-sm font-semibold text-amber-800">Export iCal</span>
      </div>
      <p className="text-xs text-amber-700">
        Partagez cette URL avec d&apos;autres plateformes pour exporter vos réservations :
      </p>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={exportUrl}
          className="flex-1 px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-xs text-stone-700 font-mono"
        />
        <button onClick={handleCopy}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-600 text-white hover:bg-amber-700 transition-colors">
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "Copié" : "Copier"}
        </button>
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────
export default function ICalSyncSection({ propertyId }: { propertyId: string }) {
  const hook = useCalendarSources(propertyId);

  const [authError, setAuthError] = useState(false);
  const [mockSources, setMockSources] = useState<MockSource[]>([]);

  // Try to fetch real sources; fall back to mock mode on auth failure
  useEffect(() => {
    hook.fetchSources().catch(() => setAuthError(true));
  }, [hook.fetchSources]);

  // Load mock data from localStorage
  useEffect(() => {
    if (authError) {
      try {
        const stored = localStorage.getItem(`ical_sources_${propertyId}`);
        if (stored) setMockSources(JSON.parse(stored));
      } catch { /* ignore */ }
    }
  }, [authError, propertyId]);

  const saveMockSources = useCallback((next: MockSource[]) => {
    setMockSources(next);
    localStorage.setItem(`ical_sources_${propertyId}`, JSON.stringify(next));
  }, [propertyId]);

  // ─── Mock mode (no Supabase) ──────────────────────────────
  if (authError) {
    return (
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400">
          Synchronisation iCal
        </h4>
        <div className="space-y-3">
          {PLATFORMS.map((p) => {
            const source = mockSources.find(s => s.platform === p.key);
            return (
              <MockPlatformRow
                key={p.key}
                platform={p}
                source={source}
                onSave={(url) => {
                  const existing = mockSources.find(s => s.platform === p.key);
                  if (existing) {
                    saveMockSources(mockSources.map(s => s.platform === p.key ? { ...s, url, savedAt: new Date().toISOString() } : s));
                  } else {
                    saveMockSources([...mockSources, { platform: p.key, url, savedAt: new Date().toISOString() }]);
                  }
                }}
                onDelete={() => {
                  saveMockSources(mockSources.filter(s => s.platform !== p.key));
                }}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // ─── Live mode (with Supabase) ─────────────────────────────
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400">
          Synchronisation iCal
        </h4>
        {hook.sources.length > 0 && (
          <button
            onClick={async () => {
              for (const s of hook.sources) {
                await hook.syncSource(s.id);
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-40 transition-colors"
          >
            <RefreshCw size={12} />
            Tout synchroniser
          </button>
        )}
      </div>

      {hook.loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 size={18} className="animate-spin text-stone-400" />
        </div>
      ) : (
        <div className="space-y-3">
          {PLATFORMS.map((p) => {
            const source = hook.getSource(p.key);
            return (
              <LivePlatformRow
                key={p.key}
                platform={p}
                source={source}
                onSave={async (url) => { await hook.saveSource(p.key, url); }}
                onTest={async (url) => {
                  hook.setTesting(p.key);
                  try { await hook.testConnection(url); }
                  finally { hook.setTesting(null); }
                }}
                onSync={async () => { if (source) await hook.syncSource(source.id); }}
                onDelete={async () => { if (source) await hook.deleteSource(source.id); }}
                onToggleAutoSync={async (autoSync) => { if (source) await hook.updateAutoSync(source.id, autoSync); }}
                onChangeInterval={async (hours) => { if (source) await hook.updateAutoSync(source.id, source.auto_sync, hours); }}
                isSyncing={hook.syncing === source?.id}
                isTesting={hook.testing === p.key}
              />
            );
          })}
          <ICalExportBlock propertyId={propertyId} />
        </div>
      )}
    </div>
  );
}
