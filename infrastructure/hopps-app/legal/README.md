# Impressum & Datenschutzerklärung (self-hosting)

hopps does **not** ship a built-in Impressum or Datenschutzerklärung — the legal
text depends on who operates the instance. You configure both at runtime, with no
image rebuild. Each page (imprint, privacy) supports three modes:

| Mode | How | Result |
|------|-----|--------|
| **Link** | set `HOPPS_IMPRINT_URL` / `HOPPS_PRIVACY_URL` | the footer links straight to your existing external page |
| **Own content** | mount a file into the container's legal dir | hopps serves and renders it in-app at `/impressum` / `/datenschutz` |
| **Off** | set neither | the page and its footer link stay hidden |

A configured URL always wins over a mounted file.

## Own content — mounted files

Mount a file into `HOPPS_LEGAL_DIR` (default `/app/legal`) using these exact base
names; the first matching extension wins:

- `impressum.html` · `impressum.txt` · `impressum.md`
- `datenschutz.html` · `datenschutz.txt` · `datenschutz.md`

`.html` is rendered isolated in a sandboxed iframe (scripts are disabled), so you
can ship a fully self-contained, styled document. `.txt` / `.md` are shown as
plain text. Templates to start from are next to this file:
[`impressum.example.html`](impressum.example.html),
[`datenschutz.example.html`](datenschutz.example.html).

## docker compose

Copy a template, fill it in, and bind-mount the `legal/` directory:

```yaml
services:
  frontend:
    environment:
      # Link mode (alternative to mounting files):
      # HOPPS_IMPRINT_URL: https://example.org/impressum
      # HOPPS_PRIVACY_URL: https://example.org/datenschutz
    volumes:
      - ./legal:/app/legal:ro
```

Then put `impressum.html` / `datenschutz.html` into this `legal/` directory.

## Kubernetes / Helm

Provide the content as a `ConfigMap` and wire it through the chart's
`frontend.volumes` / `frontend.volumeMounts`, and/or set the URL vars via
`frontend.envVars`. Example:

```yaml
frontend:
  envVars:
    # - name: HOPPS_IMPRINT_URL
    #   value: https://example.org/impressum
  volumes:
    - name: legal
      configMap:
        name: hopps-legal
  volumeMounts:
    - name: legal
      mountPath: /app/legal
      readOnly: true
```

```bash
kubectl create configmap hopps-legal \
  --from-file=impressum.html \
  --from-file=datenschutz.html
```
