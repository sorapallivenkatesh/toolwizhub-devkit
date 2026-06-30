# DevKit — devkit.toolwizhub.com

A free, **100% client-side** developer utility belt. No backend, no uploads —
everything runs in your browser using built-in Web APIs.

## Tools

- **Encode** — Hash & Encode: Base64 / Base64URL / URL / Hex encode & decode, plus SHA-1/256/512 (Web Crypto).
- **Tokens** — UUID v4 / ULID / random token generator · Password generator + strength meter · **JWT Inspector** (decode header & claims, expiry, flag `none`/weak alg).
- **Time** — **Cron Explainer** (plain English + next runs) · Epoch ↔ Date converter.
- **Text** — Regex Tester (live highlight + groups) · Case Converter · Text Diff.
- **Convert** — Color Converter (HEX/RGB/HSL) · Number Base (bin/oct/dec/hex, BigInt).

## Privacy

No analytics, no cookies, no network calls with your data. JWTs are decoded
locally (never verified remotely); passwords/tokens use the browser's crypto
RNG. Still — don't paste real production secrets into any web tool.

## How it works

Vanilla ES modules, no build step, no dependencies. `crypto.subtle` for hashing,
`crypto.randomUUID`/`getRandomValues` for tokens, native `RegExp`, and `BigInt`
for base conversion. Same ToolWizHub house theme as JSONKit / MediaKit; installable PWA, works offline.

## Run locally

```bash
npm start          # http://localhost:8096
# or: python3 -m http.server 8096
```

Serve over HTTP (ES modules).

## License

MIT — see [LICENSE](LICENSE).
