import type { Metric } from 'web-vitals';

export async function reportWebVitals(metric: Metric) {
  try {
    const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
    if (!dsn) {
      console.log('[Vitals]', metric.name, metric.value);
      return;
    }
    // lazy import sentry only when needed
    const Sentry = await import('@sentry/react');
    Sentry.captureMessage(`WebVital:${metric.name}`, {
      level: 'info',
      extra: metric as any
    });
  } catch (e) {
    console.log('[Vitals]', metric.name, metric.value);
  }
}


