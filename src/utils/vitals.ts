import type { Metric } from 'web-vitals';

export async function reportWebVitals(metric: Metric) {
  console.log('[Vitals]', metric.name, metric.value);
}


