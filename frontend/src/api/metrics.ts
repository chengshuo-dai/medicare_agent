/** Metrics API client for admin observability dashboard. */

import { API_BASE, authHeaders } from './client';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export interface LatencyStats {
  p50: number;
  p95: number;
  p99: number;
  count: number;
  avg: number;
  min?: number;
  max?: number;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface SuccessRate {
  total_calls: number;
  success: number;
  error: number;
  success_rate: number;
}

export interface ProviderStats {
  latency: LatencyStats;
  success_rate: number;
  total_calls: number;
}

export interface ErrorEntry {
  ts: number;
  provider: string;
  model: string;
  operation: string;
  error_type: string;
  error_message: string;
}

export interface CircuitState {
  state: 'closed' | 'open' | 'half_open';
  failures: number;
  opened_at: number;
  updated_at: number;
}

export interface MetricsSummary {
  latency: LatencyStats;
  tokens: TokenUsage;
  success_rate: SuccessRate;
  provider_breakdown: Record<string, ProviderStats>;
  recent_errors: ErrorEntry[];
}

export async function getMetricsSummary(): Promise<MetricsSummary> {
  const res = await fetch(`${API_BASE}/metrics/llm`, { headers: authHeaders() });
  return handleResponse<MetricsSummary>(res);
}

export async function getLatencyPercentiles(params: {
  provider?: string;
  model?: string;
  operation?: string;
  window_minutes?: number;
}): Promise<LatencyStats> {
  const searchParams = new URLSearchParams();
  if (params.provider) searchParams.set('provider', params.provider);
  if (params.model) searchParams.set('model', params.model);
  if (params.operation) searchParams.set('operation', params.operation);
  if (params.window_minutes) searchParams.set('window_minutes', String(params.window_minutes));
  const res = await fetch(`${API_BASE}/metrics/llm/latency?${searchParams.toString()}`, {
    headers: authHeaders(),
  });
  return handleResponse<LatencyStats>(res);
}

export async function getTokenUsage(params: {
  provider?: string;
  model?: string;
}): Promise<TokenUsage> {
  const searchParams = new URLSearchParams();
  if (params.provider) searchParams.set('provider', params.provider);
  if (params.model) searchParams.set('model', params.model);
  const res = await fetch(`${API_BASE}/metrics/llm/tokens?${searchParams.toString()}`, {
    headers: authHeaders(),
  });
  return handleResponse<TokenUsage>(res);
}

export async function getSuccessRate(params: {
  provider?: string;
  model?: string;
}): Promise<SuccessRate> {
  const searchParams = new URLSearchParams();
  if (params.provider) searchParams.set('provider', params.provider);
  if (params.model) searchParams.set('model', params.model);
  const res = await fetch(`${API_BASE}/metrics/llm/success-rate?${searchParams.toString()}`, {
    headers: authHeaders(),
  });
  return handleResponse<SuccessRate>(res);
}

export async function getRecentErrors(limit: number = 20): Promise<ErrorEntry[]> {
  const res = await fetch(`${API_BASE}/metrics/llm/errors?limit=${limit}`, {
    headers: authHeaders(),
  });
  return handleResponse<ErrorEntry[]>(res);
}

export async function getCircuitStatus(): Promise<Record<string, CircuitState>> {
  const res = await fetch(`${API_BASE}/metrics/llm/circuit`, { headers: authHeaders() });
  return handleResponse<Record<string, CircuitState>>(res);
}
