#!/usr/bin/env python3
"""MediCareAI LLM Performance Benchmark.

Tests 3 real-world scenarios at increasing concurrency levels:
  Scenario A — Simple greeting ("Hello")
  Scenario B — Symptom inquiry ("I have a headache and fever for 3 days")
  Scenario C — Complex diagnosis (differential diagnosis request)

Reports P50/P95/P99 latency, throughput (req/s), and error rate.
"""

import asyncio
import json
import statistics
import sys
import time
from dataclasses import dataclass, field

import httpx

BASE_URL = "http://127.0.0.1:8000/api/v1"
AUTH_URL = f"{BASE_URL}/auth/login"
CHAT_URL = f"{BASE_URL}/llm/chat"
METRICS_URL = f"{BASE_URL}/metrics/llm"

CREDENTIALS = {
    "username": "admin@medicareai.dev",
    "password": "admin123456",
}

SCENARIOS = {
    "A_greeting": {
        "messages": [{"role": "user", "content": "Hello"}],
        "max_tokens": 20,
        "description": "Simple greeting",
    },
    "B_symptom": {
        "messages": [{"role": "user", "content": "I have had a headache and fever for 3 days, what should I do?"}],
        "max_tokens": 100,
        "description": "Symptom inquiry",
    },
    "C_complex": {
        "messages": [{"role": "user", "content": "I need a differential diagnosis for a 45-year-old female with fatigue, joint pain, low-grade fever, and a butterfly rash on the face. Consider autoimmune conditions."}],
        "max_tokens": 200,
        "description": "Complex diagnosis",
    },
}

CONCURRENCY_LEVELS = [1, 5, 10]
REQUESTS_PER_LEVEL = 20  # Total requests per concurrency level


@dataclass
class RequestResult:
    scenario: str
    concurrency: int
    latency_ms: float
    success: bool
    error: str = ""
    tokens_prompt: int = 0
    tokens_completion: int = 0


@dataclass
class BenchmarkReport:
    scenario: str
    concurrency: int
    total: int
    success: int
    errors: int
    p50_ms: float
    p95_ms: float
    p99_ms: float
    avg_ms: float
    min_ms: float
    max_ms: float
    throughput_req_s: float
    total_tokens: int


async def get_token(client: httpx.AsyncClient) -> str:
    """Authenticate and get access token."""
    resp = await client.post(
        AUTH_URL,
        data=CREDENTIALS,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


async def make_llm_request(
    client: httpx.AsyncClient,
    token: str,
    scenario: dict,
    scenario_name: str,
    concurrency: int,
    semaphore: asyncio.Semaphore,
) -> RequestResult:
    """Make a single LLM chat request with timing."""
    async with semaphore:
        start = time.monotonic()
        try:
            resp = await client.post(
                CHAT_URL,
                json=scenario,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
                timeout=120,
            )
            latency_ms = (time.monotonic() - start) * 1000
            if resp.status_code == 200:
                data = resp.json()
                return RequestResult(
                    scenario=scenario_name,
                    concurrency=concurrency,
                    latency_ms=latency_ms,
                    success=True,
                    tokens_prompt=data.get("usage_prompt_tokens", 0),
                    tokens_completion=data.get("usage_completion_tokens", 0),
                )
            else:
                return RequestResult(
                    scenario=scenario_name,
                    concurrency=concurrency,
                    latency_ms=latency_ms,
                    success=False,
                    error=f"HTTP {resp.status_code}: {resp.text[:200]}",
                )
        except Exception as e:
            latency_ms = (time.monotonic() - start) * 1000
            return RequestResult(
                scenario=scenario_name,
                concurrency=concurrency,
                latency_ms=latency_ms,
                success=False,
                error=str(e)[:200],
            )


def compute_percentiles(latencies: list[float]) -> dict[str, float]:
    """Compute P50, P95, P99 from sorted latency list."""
    if not latencies:
        return {"p50": 0, "p95": 0, "p99": 0}
    latencies.sort()
    n = len(latencies)

    def pct(p: float) -> float:
        k = (p / 100) * (n - 1)
        f = int(k)
        c = k - f
        if f + 1 < n:
            return latencies[f] + c * (latencies[f + 1] - latencies[f])
        return latencies[f]

    return {"p50": pct(50), "p95": pct(95), "p99": pct(99)}


async def run_scenario(
    client: httpx.AsyncClient,
    token: str,
    scenario_name: str,
    scenario: dict,
    concurrency: int,
    num_requests: int,
) -> list[RequestResult]:
    """Run a batch of requests at a given concurrency level."""
    semaphore = asyncio.Semaphore(concurrency)
    tasks = [
        make_llm_request(client, token, scenario, scenario_name, concurrency, semaphore)
        for _ in range(num_requests)
    ]
    return await asyncio.gather(*tasks)


async def get_server_metrics(client: httpx.AsyncClient, token: str) -> dict:
    """Fetch server-side metrics after benchmark."""
    try:
        resp = await client.get(
            METRICS_URL,
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
        if resp.status_code == 200:
            return resp.json()
    except Exception:
        pass
    return {}


def print_report(report: BenchmarkReport) -> None:
    """Pretty-print a benchmark report."""
    print(f"\n{'='*70}")
    print(f"  Scenario: {report.scenario} | Concurrency: {report.concurrency}")
    print(f"{'='*70}")
    print(f"  Requests:    {report.total} total, {report.success} success, {report.errors} errors")
    print(f"  Latency P50: {report.p50_ms:>8.1f} ms")
    print(f"  Latency P95: {report.p95_ms:>8.1f} ms")
    print(f"  Latency P99: {report.p99_ms:>8.1f} ms")
    print(f"  Latency Avg: {report.avg_ms:>8.1f} ms  (min: {report.min_ms:.0f}ms, max: {report.max_ms:.0f}ms)")
    print(f"  Throughput:  {report.throughput_req_s:>8.2f} req/s")
    print(f"  Tokens used: {report.total_tokens:>8} total")


async def main():
    print("╔══════════════════════════════════════════════════╗")
    print("║   MediCareAI LLM Performance Benchmark          ║")
    print("╚══════════════════════════════════════════════════╝")
    print(f"\nBase URL: {BASE_URL}")
    print(f"Scenarios: {len(SCENARIOS)}")
    print(f"Concurrency levels: {CONCURRENCY_LEVELS}")
    print(f"Requests per level: {REQUESTS_PER_LEVEL}")
    print(f"Total requests: {len(SCENARIOS) * len(CONCURRENCY_LEVELS) * REQUESTS_PER_LEVEL}")
    print()

    all_results: list[RequestResult] = []
    reports: list[BenchmarkReport] = []

    async with httpx.AsyncClient() as client:
        # Authenticate
        print("Authenticating...")
        token = await get_token(client)
        print(f"Token obtained: {token[:20]}...\n")

        for scenario_name, scenario in SCENARIOS.items():
            print(f"\n{'─'*60}")
            print(f"  Scenario: {scenario_name} — {scenario['description']}")
            print(f"{'─'*60}")

            # Clear cache before each scenario for fair comparison
            try:
                await client.delete(
                    f"{BASE_URL}/metrics/cache",
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=5,
                )
                print("  Cache cleared for fresh baseline.")
            except Exception:
                pass

            for concurrency in CONCURRENCY_LEVELS:
                batch_start = time.monotonic()
                print(f"\n  → Concurrency={concurrency}, sending {REQUESTS_PER_LEVEL} requests...")

                results = await run_scenario(
                    client, token, scenario_name, scenario,
                    concurrency, REQUESTS_PER_LEVEL,
                )
                batch_duration = time.monotonic() - batch_start
                all_results.extend(results)

                # Compute statistics
                successes = [r for r in results if r.success]
                errors = [r for r in results if not r.success]
                latencies = [r.latency_ms for r in successes]

                if latencies:
                    pcts = compute_percentiles(latencies)
                    report = BenchmarkReport(
                        scenario=scenario_name,
                        concurrency=concurrency,
                        total=len(results),
                        success=len(successes),
                        errors=len(errors),
                        p50_ms=pcts["p50"],
                        p95_ms=pcts["p95"],
                        p99_ms=pcts["p99"],
                        avg_ms=statistics.mean(latencies),
                        min_ms=min(latencies),
                        max_ms=max(latencies),
                        throughput_req_s=len(successes) / batch_duration if batch_duration > 0 else 0,
                        total_tokens=sum(r.tokens_prompt + r.tokens_completion for r in successes),
                    )
                    print_report(report)
                    reports.append(report)
                else:
                    print(f"  ❌ All {len(results)} requests failed!")
                    for e in errors[:3]:
                        print(f"     Error: {e.error[:150]}")

                # Delay between batches to let rate limiter reset and system settle
                await asyncio.sleep(5)

        # Fetch server-side metrics
        print(f"\n\n{'='*70}")
        print("  Server-Side Metrics (from /api/v1/metrics/llm)")
        print(f"{'='*70}")
        try:
            metrics = await get_server_metrics(client, token)
            lat = metrics.get("latency", {})
            tokens = metrics.get("tokens", {})
            success_rate = metrics.get("success_rate", {})
            cache = metrics.get("cache", {})
            print(f"  Server P50:     {lat.get('p50', 0):.0f} ms")
            print(f"  Server P95:     {lat.get('p95', 0):.0f} ms")
            print(f"  Server P99:     {lat.get('p99', 0):.0f} ms")
            print(f"  Total calls:    {lat.get('count', 0)}")
            print(f"  Total tokens:   {tokens.get('total_tokens', 0)}")
            print(f"  Success rate:   {success_rate.get('success_rate', 0)}%")
            print(f"  Cache entries:  {cache.get('total_cached_entries', 0)}")
            print(f"  Cache hit rate: {cache.get('hit_rate', 'N/A')}")
        except Exception as e:
            print(f"  Failed to fetch: {e}")

    # Summary table
    print(f"\n\n{'='*70}")
    print("  SUMMARY — All Scenarios")
    print(f"{'='*70}")
    print(f"  {'Scenario':<20} {'Conc':>5} {'P50':>8} {'P95':>8} {'P99':>8} {'Req/s':>8} {'Err%':>6}")
    print(f"  {'-'*65}")
    for r in reports:
        err_pct = (r.errors / r.total * 100) if r.total > 0 else 0
        print(f"  {r.scenario:<20} {r.concurrency:>5} {r.p50_ms:>7.0f}ms {r.p95_ms:>7.0f}ms {r.p99_ms:>7.0f}ms {r.throughput_req_s:>7.2f} {err_pct:>5.1f}%")

    # Final verdict
    total_success = sum(r.success for r in reports)
    total_requests = sum(r.total for r in reports)
    overall_err = (1 - total_success / total_requests) * 100 if total_requests > 0 else 0
    print(f"\n  Overall: {total_success}/{total_requests} requests ({overall_err:.1f}% error rate)")

    # Save results
    output = {
        "timestamp": time.time(),
        "reports": [
            {
                "scenario": r.scenario,
                "concurrency": r.concurrency,
                "total": r.total,
                "success": r.success,
                "errors": r.errors,
                "p50_ms": round(r.p50_ms, 1),
                "p95_ms": round(r.p95_ms, 1),
                "p99_ms": round(r.p99_ms, 1),
                "avg_ms": round(r.avg_ms, 1),
                "throughput_req_s": round(r.throughput_req_s, 2),
            }
            for r in reports
        ],
    }
    with open("scripts/benchmark_results.json", "w") as f:
        json.dump(output, f, indent=2)
    print(f"\nResults saved to scripts/benchmark_results.json")


if __name__ == "__main__":
    asyncio.run(main())
