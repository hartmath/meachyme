import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

type CheckResult = {
  label: string;
  status: 'ok' | 'warn' | 'error';
  detail?: string;
  durationMs?: number;
};

export default function Debug() {
  const [results, setResults] = useState<CheckResult[]>([]);
  const [running, setRunning] = useState(false);

  const runChecks = async () => {
    setRunning(true);
    const out: CheckResult[] = [];
    const t0 = performance.now();

    // 1) Manifest reachability
    try {
      const m0 = performance.now();
      const res = await fetch('/manifest.json', { cache: 'no-store' });
      out.push({ label: 'Manifest reachable', status: res.ok ? 'ok' : 'warn', detail: res.status.toString(), durationMs: performance.now() - m0 });
    } catch (e: any) {
      out.push({ label: 'Manifest reachable', status: 'error', detail: e?.message });
    }

    // 2) Supabase auth user
    try {
      const m0 = performance.now();
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      out.push({ label: 'Supabase user', status: user ? 'ok' : 'warn', detail: user ? 'Authenticated' : 'No session', durationMs: performance.now() - m0 });
    } catch (e: any) {
      out.push({ label: 'Supabase user', status: 'error', detail: e?.message });
    }

    // 3) Simple DB ping (profiles count limited)
    try {
      const m0 = performance.now();
      const { count, error } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      if (error) throw error;
      out.push({ label: 'DB ping (profiles)', status: 'ok', detail: `count: ${count}`, durationMs: performance.now() - m0 });
    } catch (e: any) {
      out.push({ label: 'DB ping (profiles)', status: 'warn', detail: e?.message });
    }

    // 4) Realtime connect test (subscribe/unsubscribe)
    try {
      const m0 = performance.now();
      const channel = supabase.channel('debug_ping');
      await channel.subscribe();
      await supabase.removeChannel(channel);
      out.push({ label: 'Realtime channel', status: 'ok', durationMs: performance.now() - m0 });
    } catch (e: any) {
      out.push({ label: 'Realtime channel', status: 'warn', detail: e?.message });
    }

    setResults(out);
    setRunning(false);
    console.log('Debug checks finished in', Math.round(performance.now() - t0), 'ms', out);
  };

  useEffect(() => {
    runChecks();
  }, []);

  const color = (s: CheckResult['status']) => s === 'ok' ? 'text-green-600' : s === 'warn' ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">Diagnostics</h1>
          <Button onClick={runChecks} disabled={running} variant="outline">{running ? 'Running…' : 'Re-run'}</Button>
        </div>
        {results.map((r, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{r.label}</div>
                {r.detail && <div className="text-xs text-muted-foreground break-all">{r.detail}</div>}
              </div>
              <div className={`text-sm font-semibold ${color(r.status)}`}>{r.status.toUpperCase()}</div>
            </div>
            {typeof r.durationMs === 'number' && (
              <div className="mt-1 text-xs text-muted-foreground">{Math.round(r.durationMs)} ms</div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}


