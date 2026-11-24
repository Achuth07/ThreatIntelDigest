import { useCallback, useEffect, useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { AlertTriangle, Check, Copy, Key, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { getAuthenticatedUser } from '@/lib/auth';

// API keys in Settings (WHA-72), backed by /api/v1/account/keys. Admin-only while the API is private.
// A newly created key is held only in this component's state while its dialog is open: it is not put
// in the React Query cache or local storage, and closing the dialog drops it.

const SCOPES = [
  { id: 'catalog:read', label: 'CVEs, vendors and products' },
  { id: 'kev:read', label: 'CISA KEV' },
  { id: 'actors:read', label: 'Threat actors' },
  { id: 'news:read', label: 'News' },
  { id: 'stats:read', label: 'Statistics' },
] as const;

const EXPIRY_OPTIONS = [
  { value: '', label: 'Never' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '365', label: '1 year' },
];

interface ApiKey {
  id: string;
  key_id: string;
  name: string;
  scopes: string[];
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
}

async function callKeysApi<T>(method: 'GET' | 'POST' | 'DELETE', path = '', body?: unknown): Promise<T | null> {
  const user = getAuthenticatedUser();
  const response = await fetch(`/api/v1/account/keys${path}`, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error?.message || `Request failed (${response.status})`);
  return data as T;
}

export function ApiKeysSection({ isAdmin }: { isAdmin: boolean }) {
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [maxKeys, setMaxKeys] = useState(5);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>(SCOPES.map(s => s.id));
  const [expiry, setExpiry] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);
  const [revoking, setRevoking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await callKeysApi<{ keys: ApiKey[]; max_active_keys: number }>('GET');
      setKeys(data?.keys ?? []);
      setMaxKeys(data?.max_active_keys ?? 5);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Could not load your keys.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);

  const openCreate = () => {
    setName('');
    setScopes(SCOPES.map(s => s.id));
    setExpiry('');
    setCreateError('');
    setCreateOpen(true);
  };

  const create = async () => {
    if (!name.trim() || scopes.length === 0) return;
    setCreating(true);
    setCreateError('');
    try {
      const data = await callKeysApi<{ key: string; api_key: ApiKey }>('POST', '', { name: name.trim(), scopes, expires_in_days: expiry ? Number(expiry) : null });
      setCreateOpen(false);
      setCopied(false);
      setNewKey(data!.key);
      setKeys(current => [data!.api_key, ...current]);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Could not create the key.');
    } finally {
      setCreating(false);
    }
  };

  const copyKey = async () => {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey);
    setCopied(true);
  };

  const revoke = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      await callKeysApi('DELETE', `/${revokeTarget.id}`);
      setKeys(current => current.filter(k => k.id !== revokeTarget.id));
      toast({ title: 'Key revoked', description: `"${revokeTarget.name}" no longer works.` });
      setRevokeTarget(null);
    } catch (error) {
      toast({ title: 'Could not revoke the key', description: error instanceof Error ? error.message : undefined, variant: 'destructive' });
    } finally {
      setRevoking(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="rounded-lg border border-dashed border-slate-800 bg-slate-950 p-4">
        <p className="text-sm text-slate-300">The WhatCyber API is in private testing.</p>
        <p className="mt-1 text-xs text-slate-500">API keys will be available here when it opens.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-medium text-slate-300">API keys</h4>
          <p className="mt-1 text-xs text-slate-500">
            {keys.length} of {maxKeys} active keys. Each request is limited to 30 a minute per IP, and 60 a minute and 1,000 a day per account.
          </p>
        </div>
        <Button
          variant="outline"
          className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
          onClick={openCreate}
          disabled={loading || keys.length >= maxKeys}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create key
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading keys…</div>
      ) : loadError ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">
          {loadError} <button className="ml-2 underline" onClick={load}>Try again</button>
        </div>
      ) : keys.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-800 bg-slate-950 p-6 text-center">
          <Key className="mx-auto mb-2 h-6 w-6 text-slate-600" />
          <p className="text-sm text-slate-400">No API keys yet. Create one to call the API.</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800 bg-slate-950">
          {keys.map(key => {
            const expired = key.expires_at !== null && new Date(key.expires_at) < new Date();
            return (
              <li key={key.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-200">{key.name}</span>
                    {expired && <Badge variant="outline" className="border-red-500/40 text-red-400">Expired</Badge>}
                  </div>
                  <p className="font-mono text-xs text-slate-500">wc_live_{key.key_id}.••••••••</p>
                  <p className="text-xs text-slate-500">
                    Created {format(new Date(key.created_at), 'd MMM yyyy')}
                    {' · '}
                    {key.last_used_at ? `Last used ${formatDistanceToNow(new Date(key.last_used_at), { addSuffix: true })}` : 'Never used'}
                    {' · '}
                    {key.expires_at ? `${expired ? 'Expired' : 'Expires'} ${format(new Date(key.expires_at), 'd MMM yyyy')}` : 'No expiry'}
                  </p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {key.scopes.map(scope => (
                      <span key={scope} className="rounded border border-slate-700 px-1.5 py-0.5 font-mono text-[11px] text-slate-400">{scope}</span>
                    ))}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 self-start border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300 sm:self-center"
                  onClick={() => setRevokeTarget(key)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Revoke
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
        <p className="mb-2 text-xs font-medium text-slate-400">Try it</p>
        <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-xs text-slate-300">curl -H "X-API-Key: wc_live_…" https://api.whatcyber.com/v1/ping</pre>
        <p className="mt-2 text-xs text-slate-500">
          "Authorization: Bearer wc_live_…" works too. The full reference is at{' '}
          <a href="https://api.whatcyber.com/v1/openapi.json" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">/v1/openapi.json</a>{' '}
          (send your key to read it).
        </p>
      </div>

      {/* Create */}
      <Dialog open={createOpen} onOpenChange={open => !creating && setCreateOpen(open)}>
        <DialogContent className="border-slate-800 bg-slate-900 text-slate-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create an API key</DialogTitle>
            <DialogDescription className="text-slate-400">Name it after where you will use it, so you know which one to revoke later.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="key-name" className="text-slate-300">Name</Label>
              <Input
                id="key-name"
                value={name}
                maxLength={60}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') create(); }}
                placeholder="e.g. SIEM integration"
                className="border-slate-800 bg-slate-950 text-slate-100"
                autoFocus
              />
            </div>
            <fieldset className="space-y-2">
              <legend className="mb-1 text-sm text-slate-300">Access</legend>
              {SCOPES.map(scope => (
                <label key={scope.id} className="flex items-center gap-2 text-sm text-slate-300">
                  <Checkbox
                    checked={scopes.includes(scope.id)}
                    onCheckedChange={checked => setScopes(current => checked ? [...current, scope.id] : current.filter(s => s !== scope.id))}
                  />
                  {scope.label}
                  <span className="font-mono text-[11px] text-slate-500">{scope.id}</span>
                </label>
              ))}
            </fieldset>
            <div className="space-y-2">
              <Label htmlFor="key-expiry" className="text-slate-300">Expires</Label>
              <select
                id="key-expiry"
                value={expiry}
                onChange={e => setExpiry(e.target.value)}
                className="h-10 w-full rounded-md border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100"
              >
                {EXPIRY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            {createError && <p className="text-sm text-red-400">{createError}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={creating} className="text-slate-300">Cancel</Button>
            <Button onClick={create} disabled={creating || !name.trim() || scopes.length === 0} className="bg-cyan-500 font-semibold text-slate-950 hover:bg-cyan-600">
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Key className="mr-2 h-4 w-4" />}
              Create key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Show once */}
      <Dialog open={newKey !== null} onOpenChange={open => { if (!open) setNewKey(null); }}>
        <DialogContent className="border-slate-800 bg-slate-900 text-slate-100 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Copy your new key</DialogTitle>
            <DialogDescription className="text-slate-400">This is the only time the full key is shown.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Store it in a password manager or your secrets store. WhatCyber keeps only a hash, so a lost key cannot be recovered: revoke it and create another.</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 break-all rounded-md border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-slate-100">{newKey}</code>
              <Button variant="outline" size="sm" onClick={copyKey} className="shrink-0 border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800">
                {copied ? <Check className="mr-1 h-4 w-4 text-green-400" /> : <Copy className="mr-1 h-4 w-4" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setNewKey(null)} className="bg-cyan-500 font-semibold text-slate-950 hover:bg-cyan-600">I have saved it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke */}
      <AlertDialog open={revokeTarget !== null} onOpenChange={open => { if (!open && !revoking) setRevokeTarget(null); }}>
        <AlertDialogContent className="border-slate-800 bg-slate-900 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke "{revokeTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Anything using this key stops working straight away. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoking} className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={e => { e.preventDefault(); revoke(); }} disabled={revoking} className="bg-red-600 text-white hover:bg-red-700">
              {revoking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Revoke key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
