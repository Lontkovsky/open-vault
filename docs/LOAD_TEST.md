# Bounded resource use and measured local load

Status: local development evidence for [V023](https://github.com/Lontkovsky/openvote/issues/34). This is not a production capacity claim and is not extrapolated to national-scale participation.

## Baseline reproduction

Before the shared request gate was added, forty concurrent `auth/finish` requests for one synthetic attempt were held for three seconds by mock provider A. All forty reached the provider concurrently and all returned HTTP 200 in 3.091 seconds (`maxProviderPending: 40`). The test then restored the provider to zero delay, removed the temporary attempt and deleted the one resulting session. A JSON request above 1 MiB already returned HTTP 413 `INVALID_INPUT`; request-body size was not the missing boundary.

The same forty-request burst after the change returned eight HTTP 200 responses and thirty-two explicit HTTP 503 `SERVER_BUSY` responses in 3.093 seconds. The focused transport test independently measures a maximum of eight active handlers, sixteen queued requests, immediate rejection of the next request and expiration of a queued request after two seconds. The provider finished with `delayMs: 0` and `pending: 0`.

## Declared bounds

| Resource | Bound | Enforcement |
|---|---:|---|
| Public request body | 1,048,576 bytes | Fastify and Nginx; excess returns 413 |
| Active requests | 8 per service process | Shared FIFO request gate before route handling |
| Waiting requests | 16 per service process | The seventeenth waiting request returns 503 |
| Queue wait | 2,000 ms | Expired request returns 503; it is not promoted later |
| Request / connection input timeout | 100,000 ms | Fastify server configuration |
| URL parameter | 100 characters | Fastify router configuration |
| PostgreSQL pool | 8 connections; 5,000 ms connect; 10,000 ms statement | Shared database factory |
| Internal JSON call | 90,000 ms | Abort signal on the exact internal request |
| Provider status / authentication | 2,000 / 5,000 ms | Provider adapter abort signals |
| Gateway connect / read | 5,000 / 105,000 ms | Nginx proxy configuration |
| Native tally child | 120,000 ms | Child-process timeout |

The gate is process-local. The full synthetic runtime has separate identity, ballot, management and mock-provider processes, so these figures are not a global admission quota and do not replace upstream DDoS protection. A request that receives `SERVER_BUSY` is not processed in the background.

## Measured read profile

The committed [report](../artifacts/load/report.json) was produced on 2026-10-31 with Node 24.20.0 on Darwin arm64, Apple M3 Pro (12 logical CPUs) and 38,654,705,664 bytes of RAM. The local PostgreSQL catalogue contained two public synthetic polls (one Open, one Closed); the response body was 8,590 bytes.

The fixed profile warmed the route with 16 requests, then sent 1,000 `GET /v1/polls` requests at concurrency 8. All 1,000 succeeded in 284.339 ms: 3,516.926 requests/second measured at the client, mean 2.268 ms, p50 2.043 ms, p95 3.432 ms, p99 4.473 ms and maximum 16.611 ms.

Exact command:

```sh
pnpm load:test http://127.0.0.1:4303 .runtime/load-report.json
```

The output path must not already exist. The script accepts only a loopback HTTP management origin, performs anonymous catalogue reads, records no identity or ballot material and exits nonzero if any measured response fails.

This result covers one small read-heavy local dataset. It does not measure encrypted ballot generation, write contention, native tallying, public Internet latency, Render resources, DDoS absorption or millions of participants. Those require separate profiles on the selected deployment and must report their own hardware and data sizes.
