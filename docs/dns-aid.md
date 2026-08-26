# DNS for AI Discovery (DNS-AID)

The [isitagentready.com](https://isitagentready.com) scanner looks up
DNS-AID records over DNS-over-HTTPS. Those records **cannot be published
from this web app** — they live in the DNS zone for
`governance.aptosfoundation.org` (or whichever apex hosts a deployment).

## Records to publish

Copy from [`dns/agents.zone`](../dns/agents.zone). Required shape:

- ServiceMode `SVCB` (priority `1`, not alias-mode `0`) at
  `_index._agents.<apex>` and `_a2a._agents.<apex>`
- `alpn` and `port=443` parameters
- DNSSEC signatures on the public discovery names

Example:

```dns
_index._agents.governance.aptosfoundation.org.  3600 IN SVCB 1 governance.aptosfoundation.org. alpn="h2,http/1.1" port=443
_a2a._agents.governance.aptosfoundation.org.    3600 IN SVCB 1 governance.aptosfoundation.org. alpn="h2,http/1.1" port=443
```

Also recommended:

```dns
_catalog._agents.governance.aptosfoundation.org. 3600 IN TXT "url=https://governance.aptosfoundation.org/.well-known/ai-catalog.json"
```

Keep these names **DNS-only** (grey-cloud). An HTTP proxy on the `_agents`
labels will hide the SVCB answers.

## Check

```bash
curl -sS 'https://cloudflare-dns.com/dns-query?name=_index._agents.governance.aptosfoundation.org&type=SVCB' \
  -H 'accept: application/dns-json'
```

Then:

```http
POST https://isitagentready.com/api/scan
Content-Type: application/json

{"url": "https://governance.aptosfoundation.org"}
```

Expect `checks.discoverability.dnsAid.status` to be `"pass"` once the
records are live and the zone is signed.
