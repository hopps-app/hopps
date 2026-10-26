# Umsetzungsplan: Claude-getriebener Ticket-zu-PR-Flow mit Preview-Umgebungen pro Pull Request

Stand: 2026-09-20. Analysiert wurden das Repo `hopps-app/hopps`, das GitOps-Repo `hopps-app/hopps.cloud`
und das laufende Cluster (`captain-kube`, Zugriff über den lokalen kubeconfig-Kontext).

## 1. Zielbild

```
GitHub Issue
   │  "@claude" / Label "claude"            (oder: lokales Claude Code im Worktree)
   ▼
claude-code-action (GitHub-hosted Runner = eigene, kurzlebige VM)
   │  Branch claude/issue-123-… , Commits, PR mit Label "preview"
   ▼
PR in hopps  ──► preview.yml: Images + Chart für den PR-Head bauen (Tag pr-123-<sha7>)
   │                 │
   │                 └─► Commit nach hopps.cloud: infrastructure/hopps/previews/pr-123.yaml
   │                                              (eine Flux-Kustomization pro PR)
   ▼
Flux (kustomize-controller) ──► Namespace hopps-pr-123
                                 ├─ CNPG-Postgres (org + keycloak DB, klein)
                                 ├─ Keycloak mit Realm-Import (alice/alice, …)
                                 ├─ org, az-document-ai, zugferd, frontend, admin, greenmail/roundcube
                                 └─ Ingress: pr-123.preview.hopps.cloud, pr-123-api…, pr-123-id…, pr-123-admin…
   │
   │  PR-Kommentar "@claude …" ──► claude-code-action pusht Fix ──► preview.yml läuft erneut ──► Flux rollt neu aus
   ▼
PR merged/closed ──► preview-cleanup.yml löscht previews/pr-123.yaml ──► Flux prune entfernt Namespace + PVCs
```

Nutzen: kein lokaler Stack mehr nötig, um Claude-Änderungen zu testen; mehrere Features parallel, jedes mit
eigener URL, eigener Datenbank, eigenem Keycloak.

## 2. Ist-Analyse (Befunde)

### 2.1 App-Repo `hopps`

| Bereich | Befund | Relevanz für Previews |
|---|---|---|
| Image-Builds | `backend.yml` (Matrix org / az-document-ai / zugferd), `frontend.yml`, `admin.yml`, `keycloak.yml` bauen auf **jedem Branch-Push** und pushen nach GHCR. Backend taggt Feature-Branches mit `type=ref,event=branch` (mutabler Branch-Tag), Frontends mit `GITHUB_RUN_NUMBER`. | Images pro Branch existieren bereits, aber uneinheitlich getaggt und nicht pro Commit eindeutig. |
| Deploy-Trigger | Nur auf `main`: `workflow_dispatch` nach `hopps.cloud/deploy.yml` mit `TECHNICAL_USER_PAT`. | PAT existiert und kann für Preview-Commits nach `hopps.cloud` wiederverwendet werden. |
| Backend-Build | `FIXME` im Workflow: jede Änderung unter `backend/**` baut alle drei Services. | Für Previews akzeptabel (Actions sind für öffentliche Repos kostenlos), aber Laufzeit ca. 6–8 min. |
| Helm-Chart | `charts/hopps` 0.2.11, publiziert nur bei Push auf `main` unter der Version aus `Chart.yaml` (kein Auto-Bump). Subcharts: `keycloakx` 7.0.1 (codecentric), `postgresql` (bitnami, in allen Overlays deaktiviert). | Chart-Änderungen in einem PR sind heute erst nach Merge testbar. Previews brauchen ein Prerelease-Chart pro PR. |
| Chart-Ressourcen | Alle `resources: {}`; keine Requests/Limits, auch nicht in dev. | Previews müssen Requests/Limits setzen, sonst keine Kapazitätsplanung. |
| Keycloak | Theme-Image `ghcr.io/hopps-app/hopps/hopps-keycloak:<run>-keycloak-26.2.1`. Realm `hopps` in dev wurde **manuell** angelegt (Clients `hopps-frontend`, `hopps` (Service-Account, Admin-Rechte), `hopps-dev-admin`). Es gibt keinen Realm-Import im Chart. `quarkus-realm.json` (Realm `quarkus`, User alice/jdoe/admin) wird nur von Dev Services genutzt. | Größter Baustein: reproduzierbarer Realm pro Preview. |
| Testdaten | `TestdataBootstrapper` läuft nur in `LaunchMode.DEVELOPMENT`/`TEST`, nie im `prod`-Image. Member werden über `keycloakId` gemappt. | Previews starten mit leerer DB; Registrierung über die UI oder ein Preview-spezifischer Seed nötig. |
| Storage | `S3Handler` gegen DigitalOcean Spaces (`fra1`), Bucket `hopps-dev-fin` in dev. PR #811 (offen) führt `HOPPS_STORAGE_TYPE=local` ein. | Mit #811 brauchen Previews kein S3 (emptyDir/PVC). |
| Claude | `claude-code-review.yml` vorhanden, Trigger auskommentiert, Secret `CLAUDE_CODE_OAUTH_TOKEN` ist **nicht** in den Repo-Secrets (Org-Secrets nicht einsehbar). | Wiederverwendbar; Secret muss angelegt werden. |
| Secrets (Repo) | `DEPENDENCYTRACK_APIKEY`, `NPM_TOKEN`, `SONAR_TOKEN`, `TECHNICAL_USER_PAT`. Default-Workflow-Permission: write. | – |
| Offene PRs | 10, davon 5 Dependabot. | Previews müssen opt-in sein (Label), sonst Ressourcen-Explosion. |

### 2.2 GitOps-Repo `hopps.cloud`

| Bereich | Befund |
|---|---|
| Struktur | `infrastructure/hopps/base/hopps` (HelmRepository OCI + HelmRelease) und Overlays `dev`, `demo`, `prod`, `landingpage`. Jedes Overlay: Namespace (PSS `restricted`), CNPG-`Cluster` (10 Gi + 10 Gi WAL), `Database`-CRs, Traefik-Middlewares (CORS, swagger-redirect), sops-verschlüsselte `.env`-Secrets via `secretGenerator`. |
| Variablen | `${DOMAIN_2}` etc. kommen aus Flux `postBuild.substituteFrom` Secret `cluster-secrets` (`DOMAIN_2=hopps.cloud`). Hardcodiert bleibt `KC_HOSTNAME=https://id.dev.hopps.cloud`. |
| Middleware-Referenzen | Namespace-abhängig (`hopps-dev-cors-api@kubernetescrd`). |
| deploy.yml | Setzt per `yq` den Image-Tag im Overlay und committet. `git pull --rebase` als Schutz gegen parallele Matrix-Jobs. Kein Concurrency-Group. |
| Kein Branch-Schutz | `main` in hopps.cloud ist ungeschützt; Actions dürfen direkt pushen. |

### 2.3 Cluster / Flux

| Bereich | Befund |
|---|---|
| Node | 1 Node (Hetzner, `46.4.68.185`), 8 CPU, 64 GiB RAM, 512 GB NVMe (Longhorn: 119 GiB frei, default-replica-count 3 auf einem Node). |
| Auslastung | CPU-Requests 79 % (6.4 von 8 Cores, von anderen Workloads), Speicher-Nutzung ca. 42.5 GiB von 64 GiB. **Etwa 20 GiB RAM frei.** |
| hopps-dev Verbrauch | keycloak ~1.0 Gi, org ~570 Mi, az-document-ai ~520 Mi, zugferd ~400 Mi, greenmail ~300 Mi, postgres ~185 Mi, frontend/admin/roundcube ~150 Mi. **Summe ca. 3.1 GiB pro voller Umgebung.** |
| Flux | v2 mit source/kustomize/helm/notification-controller. Kustomizations `hopps-dev/demo/prod/landingpage` liegen im **privaten Cluster-Repo `manuelhummler/flux-multicluster`** (nicht im Workspace). Jede: `prune: true`, sops-Decryption (`sops-hopps-age`), `dependsOn: longhorn, cloudnative-pg-operator`, Intervall 10 min; `GitRepository hopps` pollt jede Minute. |
| Flux-Hygiene | HelmReleases `traefik`, `minio`, `keycloak` (Namespace `keycloak`) sind seit längerem **Failed**; Kustomizations `fest-der-demokratie`, `juno-care`, `mariadb` blockiert durch `dependsOn traefik/minio`. Traefik läuft mit dem alten Release weiter. **Neue Preview-Kustomizations dürfen nicht auf `traefik` dependen.** |
| Ingress/TLS | Traefik, cert-manager `letsencrypt-prod` (HTTP-01). Keine `TLSStore`/Wildcard-Zertifikate. **Wildcard-DNS `*.hopps.cloud` zeigt bereits auf den Node** (Hetzner DNS, `ns1.your-server.de`). |
| Webhooks | Keine Flux `Receiver`; Reconcile nur per Polling. |
| MinIO | Läuft (Pod 326 d), HelmRelease aber kaputt; nur intern erreichbar. Nicht als Preview-Storage einplanen. |

### 2.4 Zentrale technische Rahmenbedingungen

1. **Keycloak-Redirect-URIs erlauben keine Host-Wildcards** (`https://*.preview.hopps.cloud/*` ist ungültig, nur Pfad-Suffix-Wildcards). Ein geteilter Keycloak müsste pro PR per Admin-API Redirect-URIs pflegen.
2. **Pushes mit `GITHUB_TOKEN` lösen keine weiteren Workflows aus.** Commits von `claude-code-action` müssen mit GitHub-App-Token oder PAT gepusht werden, sonst laufen weder Image-Build noch Preview-Deploy.
3. **Let's Encrypt Limits:** 50 Zertifikate/Woche pro Domain, 5 Duplikate/Woche. Mit 4–5 Hosts pro Preview über HTTP-01 wird das bei häufigem Auf-/Abbau eng. Ein Wildcard-Zertifikat `*.preview.hopps.cloud` per DNS-01 löst das.
4. **RAM ist der limitierende Faktor**, nicht CPU. Realistisch **3 gleichzeitige Previews**, 4 als hartes Maximum, solange nichts anderes vom Node entfernt wird.

## 3. Zielarchitektur

### 3.1 Namensschema

| Objekt | Schema | Beispiel |
|---|---|---|
| Namespace | `hopps-pr-<nr>` | `hopps-pr-123` |
| SPA | `pr-<nr>.preview.${DOMAIN_2}` | `pr-123.preview.hopps.cloud` |
| API | `pr-<nr>-api.preview.${DOMAIN_2}` | `pr-123-api.preview.hopps.cloud` |
| Keycloak | `pr-<nr>-id.preview.${DOMAIN_2}` | `pr-123-id.preview.hopps.cloud` |
| Admin | `pr-<nr>-admin.preview.${DOMAIN_2}` | `pr-123-admin.preview.hopps.cloud` |
| Mail (Roundcube) | `pr-<nr>-mail.preview.${DOMAIN_2}` | `pr-123-mail.preview.hopps.cloud` |
| Image-Tag | `pr-<nr>-<sha7>` (zusätzlich `sha-<sha40>`) | `org:pr-123-a1b2c3d` |
| Chart-Version | `<Chart.yaml version>-pr<nr>.<sha7>` | `0.2.11-pr123.a1b2c3d` |

Alle Hosts liegen **eine Ebene** unter `preview.hopps.cloud`, damit ein einziges Wildcard-Zertifikat reicht.

### 3.2 GitOps-Mechanik: eine Flux-Kustomization pro PR

Ein gemeinsames Overlay `infrastructure/hopps/overlays/preview/` in `hopps.cloud` enthält alle Manifeste mit
Platzhaltern (`${PR_NUMBER}`, `${ORG_TAG}`, `${CHART_VERSION}`, …). Pro PR committet der Workflow **nur eine
kleine Datei** `infrastructure/hopps/previews/pr-123.yaml`:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: hopps-pr-123
  namespace: flux-system
  labels:
    hopps.app/preview: "true"
    hopps.app/pr: "123"
spec:
  interval: 5m
  retryInterval: 1m
  timeout: 10m
  path: ./infrastructure/hopps/overlays/preview
  sourceRef: { kind: GitRepository, name: hopps }
  prune: true
  wait: false
  dependsOn:
    - name: longhorn
    - name: cloudnative-pg-operator
  decryption:
    provider: sops
    secretRef: { name: sops-hopps-age }
  postBuild:
    substituteFrom:
      - { kind: Secret, name: cluster-secrets }
    substitute:
      PR_NUMBER: "123"
      PR_HEAD_SHA: "a1b2c3d"
      CHART_VERSION: "0.2.11-pr123.a1b2c3d"
      ORG_TAG: "pr-123-a1b2c3d"
      AZ_DOCUMENT_AI_TAG: "pr-123-a1b2c3d"
      ZUGFERD_TAG: "pr-123-a1b2c3d"
      FRONTEND_TAG: "pr-123-a1b2c3d"
      ADMIN_TAG: "pr-123-a1b2c3d"
      KEYCLOAK_TAG: "pr-123-a1b2c3d-keycloak-26.2.1"
  healthChecks:
    - { apiVersion: helm.toolkit.fluxcd.io/v2, kind: HelmRelease, name: hopps, namespace: hopps-pr-123 }
```

Ein **einmalig manuell** anzulegendes Eltern-Objekt `hopps-previews` im privaten Repo `flux-multicluster`
zeigt auf `./infrastructure/hopps/previews` mit `prune: true`. Datei löschen = Kustomization weg = Flux
räumt Namespace, PVCs und Zertifikate ab. Kein Cluster-Zugriff aus GitHub Actions nötig.

Vorteile gegenüber `helm upgrade` direkt aus Actions: kein Kubeconfig in GitHub, gleiche Mechanik wie dev/demo/prod,
Zustand vollständig im Git nachvollziehbar, Cleanup durch Flux-Prune garantiert.

### 3.3 Preview-Overlay (Unterschiede zu `dev`)

- `namespace.yaml`: `hopps-pr-${PR_NUMBER}` mit denselben PSS-Labels.
- `cnpg-cluster.yaml`: `instances: 1`, Storage 2 Gi + 1 Gi WAL, `resources` requests 100m/256Mi, Rollen `org` und `keycloak`, Passwörter aus **statischen** sops-Secrets des Preview-Overlays (nicht geheim im engeren Sinn, aber nicht im PR-Kommentar).
- `helm-release.yaml`: Chart-Version `${CHART_VERSION}`, alle Image-Tags aus Variablen, Hosts nach 3.1, Middlewares `hopps-pr-${PR_NUMBER}-cors-api@kubernetescrd`, `KC_HOSTNAME=https://pr-${PR_NUMBER}-id.preview.${DOMAIN_2}`.
- `resources` für jeden Container (Vorschlag: org 300m/768Mi, az-document-ai 200m/640Mi, zugferd 200m/512Mi, keycloak 300m/768Mi mit `JAVA_OPTS_KC_HEAP=-Xms128m -Xmx512m`, frontend/admin 50m/96Mi, greenmail 100m/384Mi, roundcube 50m/128Mi). Ziel: **≤ 2.5 GiB Limit-Summe pro Preview**.
- `keycloak` mit Realm-Import (siehe 3.4).
- Storage: `HOPPS_STORAGE_TYPE=local` + PVC 2 Gi (setzt PR #811 voraus), Fallback: geteilter Bucket `hopps-preview` mit Objekt-Präfix (nur falls #811 nicht kommt).
- `org`: `APP_HOPPS_ORG_AUTH_INVITATION_CLIENT_ID=hopps-frontend`, `HOPPS_SPA_URL=https://pr-${PR_NUMBER}.preview.${DOMAIN_2}/`.
- Secrets: **ein** sops-verschlüsselter Satz unter `overlays/preview/secrets/` (Azure Document AI, OpenAI, Keycloak-Client-Secret, DB-Passwörter). Wird für alle Previews geteilt, da Flux die Secrets pro Kustomization in den jeweiligen Namespace rendert.
- Ingress ohne eigenes `tls.secretName` (Traefik-Default-Zertifikat, siehe 3.5) oder mit HTTP-01 pro Host als Fallback.
- Optional: Traefik `IPAllowList`-Middleware auf allen Preview-Hosts (Entscheidung 6).

### 3.4 Keycloak pro Preview mit Realm-Import

Das Theme-Image basiert auf `keycloak/keycloak:26.2.1`; `kc.sh start --import-realm` importiert alle JSON-Dateien aus
`/opt/keycloak/data/import`. Keycloak ersetzt in Realm-Dateien Platzhalter `${ENV_VAR}` durch Umgebungsvariablen
(dokumentiert im Keycloak Import/Export Guide, im Spike verifizieren).

Umsetzung im `keycloakx`-Subchart über die HelmRelease-Values:

```yaml
keycloak:
  command: ["/opt/keycloak/bin/kc.sh", "start", "--import-realm"]
  extraEnv: |
    - name: KC_HOSTNAME
      value: https://pr-${PR_NUMBER}-id.preview.${DOMAIN_2}
    - name: HOPPS_PREVIEW_SPA_URL
      value: https://pr-${PR_NUMBER}.preview.${DOMAIN_2}
    - name: HOPPS_PREVIEW_ADMIN_URL
      value: https://pr-${PR_NUMBER}-admin.preview.${DOMAIN_2}
    - name: HOPPS_PREVIEW_CLIENT_SECRET
      valueFrom: { secretKeyRef: { name: org, key: QUARKUS_OIDC_CREDENTIALS_SECRET } }
    - name: JAVA_OPTS_KC_HEAP
      value: "-Xms128m -Xmx512m"
  extraVolumes: |
    - name: realm-import
      configMap: { name: keycloak-preview-realm }
  extraVolumeMounts: |
    - name: realm-import
      mountPath: /opt/keycloak/data/import
      readOnly: true
```

Die Realm-Datei `hopps-preview-realm.json` (ConfigMap im Preview-Overlay, generiert aus `quarkus-realm.json`) enthält:
Realm `hopps`, `loginTheme: hopps-login-theme`, Clients `hopps-frontend` (public, Redirect `${HOPPS_PREVIEW_SPA_URL}/*`),
`hopps-admin` (public, Redirect `${HOPPS_PREVIEW_ADMIN_URL}/*`), `hopps` (confidential, Service-Account mit
`realm-management`-Rollen `manage-users`, `view-users`, `manage-realm`, Secret `${HOPPS_PREVIEW_CLIENT_SECRET}`),
Realm-Rollen `Owner`, `org-admin`, `admin`, User `alice`, `jdoe`, `admin` mit bekannten Passwörtern, SMTP auf
`hopps-greenmail:3025`. Der Import ist idempotent (Realm wird bei Neustart übersprungen, wenn vorhanden).

Alternative "geteilter dev-Keycloak" wurde verworfen: Host-Wildcards in Redirect-URIs sind nicht möglich, die
Nutzerprovisionierung des org-Service würde in den dev-Realm schreiben, und `keycloakId`-Konflikte zwischen frischer
Preview-DB und bestehendem Realm sind vorprogrammiert.

### 3.5 DNS und TLS

DNS ist bereits gelöst (Wildcard `*.hopps.cloud` → Node). Für TLS zwei Wege:

- **A (empfohlen):** Wildcard-Zertifikat `*.preview.hopps.cloud` via cert-manager DNS-01 gegen Hetzner DNS
  (`cert-manager-webhook-hetzner`, API-Token als Secret in `cert-manager`). Ein `Certificate` im Traefik-Namespace plus
  `TLSStore default` mit `defaultCertificate.secretName`. Preview-Ingresses brauchen dann **keinen** `tls`-Block und kein
  Warten auf Ausstellung. Änderungen liegen in `flux-multicluster` (Cluster-Repo).
- **B (Fallback, keine Cluster-Änderung):** HTTP-01 pro Host wie in dev. Fünf Zertifikate pro Preview, ca. 1–2 min
  Wartezeit, Rate-Limit-Risiko bei mehr als ~10 Preview-Neuanlagen pro Woche.

### 3.6 CI-Workflows im `hopps`-Repo

**`preview.yml`** (neu), Trigger `pull_request` `[opened, synchronize, reopened, labeled]`, Guard: Label `preview`
vorhanden **und** `github.event.pull_request.head.repo.full_name == github.repository` (keine Forks).
Concurrency-Group `preview-${{ github.event.pull_request.number }}`, `cancel-in-progress: true`.

Jobs:
1. `images` (Matrix: org, az-document-ai, zugferd, frontend, admin, keycloak): baut wie die bestehenden Workflows,
   Tags `pr-<nr>-<sha7>` und `sha-<sha>`, Buildx-Cache `type=gha` pro Service. Sinnvoll: die Build-Schritte in
   Composite-Actions (`.github/actions/build-backend-service`, `build-frontend-app`) auslagern, damit Push- und
   Preview-Workflow denselben Code verwenden.
2. `chart`: `helm dependency update` + `helm package --version <v>-pr<nr>.<sha7>` + `helm push oci://ghcr.io/hopps-app`.
3. `deploy` (needs 1+2): Checkout `hopps.cloud` mit `TECHNICAL_USER_PAT`, `previews/pr-<nr>.yaml` aus Template
   rendern, Commit `🚀 preview pr-<nr> @ <sha7>`, Push mit Rebase-Retry. Anschließend GitHub-Deployment
   (`environment: preview/pr-<nr>`, `environment_url`) anlegen und einen **sticky PR-Kommentar** (Marker
   `<!-- hopps-preview -->`) mit URLs, Zugangsdaten-Hinweis (ohne Passwörter), Image-Tags und Zeitstempel setzen.
4. `wait-ready` (optional): pollt bis zu 15 min `https://pr-<nr>-api…/q/health/ready` und `https://pr-<nr>…/`, aktualisiert
   Kommentar und Deployment-Status auf `success`/`failure`.

**`preview-cleanup.yml`** (neu), Trigger `pull_request` `[closed, unlabeled]` (bei `unlabeled` nur wenn Label
`preview` entfernt wurde): löscht `previews/pr-<nr>.yaml` in `hopps.cloud`, setzt Deployment auf `inactive`,
aktualisiert Kommentar.

**`preview-gc.yml`** (neu), `schedule` täglich: vergleicht `previews/*.yaml` mit offenen PRs (Label `preview`),
löscht Waisen und Previews ohne Commit seit N Tagen (Vorschlag 7). Sicherheitsnetz gegen vergessene Umgebungen.

**Anpassungen bestehender Workflows:** `push`-Trigger auf Feature-Branches können nach Einführung von `preview.yml`
auf `main` und Tags eingeschränkt werden (spart Doppelbuilds), oder bleiben bestehen und `preview.yml` nutzt nur
die Composite-Actions. `keycloak.yml`: `if`-Guard prüfen (verhindert heute PR-Builds aus dem eigenen Repo).

### 3.7 Claude-Automatisierung

**Ticket → PR (Server-Variante):** `.github/workflows/claude.yml` mit `anthropics/claude-code-action@v1`:
- Trigger `issues: [opened, labeled]` (Label `claude`), `issue_comment`, `pull_request_review_comment`,
  `pull_request_review` mit Trigger-Phrase `@claude`.
- Token zum Pushen: GitHub App (`actions/create-github-app-token`) oder `TECHNICAL_USER_PAT` als `github_token`,
  damit die Commits `preview.yml` auslösen (siehe 2.4 Punkt 2).
- Auth gegen Anthropic: `ANTHROPIC_API_KEY` (API-Abrechnung) oder `CLAUDE_CODE_OAUTH_TOKEN` (Subscription).
- `claude_args`: `--max-turns`, erlaubte Tools (Bash für `mvn`, `pnpm`, `gh`), Modell.
- Prompt-Konventionen in `CLAUDE.md`: Branch `claude/issue-<nr>-<slug>`, Conventional Commits, PR mit Label
  `preview` anlegen, Preview-URL im PR beschreiben, bei PR-Kommentaren den bestehenden Branch fortführen.
- Der GitHub-hosted Runner ist die "eigene Docker-Instanz": Docker steht für Testcontainers (`mvn verify`) zur
  Verfügung, jeder Lauf ist isoliert und wird danach verworfen.

**Ticket → PR (lokale Variante):** Claude Code Desktop mit Git-Worktree pro Feature (`EnterWorktree`), `gh pr create
--label preview`. Parallelität = mehrere Worktrees/Sessions, jeder PR bekommt seine eigene Preview.

**PR-Kommentar → Änderung → Redeploy:** Kommentar `@claude <Anweisung>` (oder Review-Kommentar an einer Codezeile).
Die Action checkt den PR-Branch aus, committet, pusht → `preview.yml` läuft → Flux rollt neu aus. Für lokal:
Kommentar lesen (`gh pr view --comments`) und im Worktree umsetzen.

**Review:** `claude-code-review.yml` reaktivieren, sobald das Secret existiert.

**Verifikation durch Claude (Ausbaustufe):** Das Repo enthält bereits die `playwright-cli`-Skill. In der Action kann
Claude nach `wait-ready` End-to-End-Checks gegen die Preview-URL fahren und Screenshots in den PR-Kommentar hängen.

### 3.8 Cleanup und Kapazitätsschutz

- Cleanup bei Merge/Close über `preview-cleanup.yml` + Flux-Prune (Namespace inkl. PVCs, Longhorn `reclaimPolicy: Delete`).
- Kapazitätscheck in `preview.yml` vor dem Deploy: Anzahl `previews/*.yaml` in `hopps.cloud` zählen; bei ≥ `MAX_PREVIEWS`
  (Vorschlag 3) Deployment verweigern und im PR kommentieren, welche Previews aktiv sind.
- `LimitRange` und `ResourceQuota` im Preview-Namespace (z. B. 3 Gi RAM, 2 CPU Limits), damit ein fehlerhaftes
  Chart nicht den Node verdrängt.
- `preview-gc.yml` als Sicherheitsnetz.

## 4. Umsetzungsphasen

### Phase 0: Vorbereitung und Entscheidungen (manuell, ca. 0.5 Tag)

| # | Aufgabe | Wo | Wer |
|---|---|---|---|
| 0.1 | Entscheidungen aus Abschnitt 5 treffen | – | Manuel |
| 0.2 | Flux-Kustomization `hopps-previews` (Pfad `./infrastructure/hopps/previews`, `prune: true`, `dependsOn: longhorn, cloudnative-pg-operator`, **nicht** auf traefik) anlegen | `flux-multicluster` | Manuel (Repo ist privat; alternativ Zugriff für Claude) |
| 0.3 | Bei Variante A: Hetzner-DNS-API-Token als Secret, `cert-manager-webhook-hetzner`, `ClusterIssuer letsencrypt-dns`, `Certificate *.preview.hopps.cloud`, Traefik `TLSStore default` | `flux-multicluster` | Manuel |
| 0.4 | GitHub: Secret `ANTHROPIC_API_KEY` oder `CLAUDE_CODE_OAUTH_TOKEN`; optional GitHub App für claude-code-action; prüfen, dass `TECHNICAL_USER_PAT` `repo`-Scope auf `hopps.cloud` hat | GitHub | Manuel |
| 0.5 | Labels `preview` und `claude` im Repo anlegen | GitHub | Claude (gh) |
| 0.6 | Spike (1–2 h): Keycloak `--import-realm` mit `${ENV}`-Platzhaltern im Theme-Image lokal verifizieren; Flux `postBuild.substitute` in `kustomization.yaml`-`namespace:` verifizieren | lokal | Claude |

### Phase 1: Images und Chart pro PR (ca. 1–2 Tage, hopps-Repo)

1. Composite-Actions `build-backend-service`, `build-frontend-app`, `build-keycloak-theme` aus den bestehenden Workflows extrahieren; bestehende Workflows darauf umstellen (Verhalten unverändert).
2. `preview.yml` mit Jobs `images` und `chart` (noch ohne Deploy) inkl. Label-/Fork-Guard, Concurrency, GHA-Buildcache.
3. Tag-Schema `pr-<nr>-<sha7>` und `sha-<sha>` in `docker/metadata-action` ergänzen.
4. Chart-Prerelease: `helm package --version` + `helm push` (OCI-Tags: `+` wird zu `_`, `-` ist erlaubt).
5. Akzeptanz: Label `preview` auf Test-PR setzen → 6 Images + Chart in GHCR mit korrekten Tags, Laufzeit < 10 min.

### Phase 2: Preview-Overlay in `hopps.cloud` (ca. 2–3 Tage)

1. `infrastructure/hopps/overlays/preview/` nach 3.3 anlegen (Namespace, CNPG, Databases, Middlewares, HelmRelease, ConfigMap Realm, LimitRange/ResourceQuota).
2. Realm-Datei `hopps-preview-realm.json` aus `quarkus-realm.json` ableiten (Realm-Name `hopps`, Clients wie in dev, Platzhalter für Hosts/Secret).
3. Secrets-Satz `overlays/preview/secrets/*.env` mit `sops --age age13pk…` verschlüsseln (Azure, OpenAI, DB-Passwörter, Client-Secret). Werte aus dev übernehmen bzw. neu generieren.
4. Template `infrastructure/hopps/previews/_template.yaml` (wird von CI gerendert; Unterstrich-Datei muss von Kustomize ignoriert werden → `previews/kustomization.yaml` mit expliziter Ressourcenliste oder Template außerhalb des Pfads ablegen, z. B. `infrastructure/hopps/preview-template/`).
5. `README.md` im Overlay: Ablauf, Debugging (`flux get ks hopps-pr-123`, `kubectl -n hopps-pr-123 get pods`).
6. Manueller Test: `previews/pr-0.yaml` mit dev-Tags committen → Umgebung kommt hoch, Login alice funktioniert, Beleg-Upload funktioniert (Storage), Einladungsmail landet in Roundcube. Dann Datei löschen → Namespace verschwindet vollständig.
7. Akzeptanz: Zeit von Commit bis "ready" < 6 min (ohne Image-Build), RAM-Limit-Summe ≤ 2.5 GiB, Cleanup rückstandsfrei (PVCs, Certificates, Secrets).

Voraussetzung für lokalen Storage: PR #811 mergen (oder Preview vorerst mit geteiltem Spaces-Bucket `hopps-preview`).

### Phase 3: Deploy-/Cleanup-Automation (ca. 1–2 Tage, hopps-Repo)

1. Job `deploy` in `preview.yml` (Render, Commit nach `hopps.cloud`, Rebase-Retry, Kapazitätscheck, Deployment + sticky Kommentar).
2. `preview-cleanup.yml`, `preview-gc.yml`.
3. Optional `wait-ready`-Job und Flux `Receiver` (GitHub-Webhook auf `hopps.cloud` → sofortiger Reconcile statt bis 1 min Polling; Ingress `flux-webhook.kube.hummler.com` im Cluster-Repo).
4. Optional: Flux `Alert` → `github`-Provider setzt Commit-Status auf `hopps.cloud`, oder `githubdispatch` → `repository_dispatch` nach `hopps` für Status im PR.
5. Akzeptanz: PR mit Label `preview` öffnen → nach < 15 min Kommentar mit funktionierenden URLs; neuer Commit → Rollout mit neuen Tags; PR schließen → Datei in `hopps.cloud` weg, Namespace nach < 5 min weg.

### Phase 4: Claude-Integration (ca. 1 Tag)

1. `claude.yml` (Issue/PR-Kommentar-Trigger) mit App-Token/PAT, `max-turns`, erlaubten Tools.
2. `claude-code-review.yml` reaktivieren.
3. `CLAUDE.md` erweitern: Branch-/PR-Konventionen, Label `preview` setzen, Preview-URL-Schema, wie Rückmeldungen aus PR-Kommentaren verarbeitet werden, `gh`-Befehle.
4. Lokaler Flow dokumentieren (Worktree pro Issue, `gh pr create --label preview`).
5. Akzeptanz: Issue mit `@claude` → PR mit Preview; Kommentar `@claude bitte X ändern` → neuer Commit → neue Preview-Version.

### Phase 5: Härtung und Betrieb (ca. 1–2 Tage)

1. Zugriffsschutz auf Preview-Hosts (Entscheidung 6).
2. `MAX_PREVIEWS`, `ResourceQuota`, Alerting bei RAM > 85 % (kube-prometheus-stack existiert).
3. Beobachtung nach 2 Wochen: Laufzeiten, LE-Zertifikatsverbrauch, Longhorn-Belegung, Kosten Azure/OpenAI durch Previews.
4. Aufräumen der bestehenden Workflows (Feature-Branch-Pushes ohne Preview nicht mehr bauen, `FIXME` Pfadfilter pro Backend-Service).
5. Optional: Playwright-E2E durch Claude gegen die Preview, Screenshots im PR.

**Gesamtaufwand:** ca. 7–10 Arbeitstage, inkrementell als einzelne PRs umsetzbar. Phase 1 und Phase 2 sind unabhängig
und können parallel laufen. Phase 3 braucht beide.

## 5. Entscheidungen, die ich brauche

| # | Frage | Optionen | Empfehlung |
|---|---|---|---|
| 1 | GitOps-Mechanik für Previews | (a) Flux-Kustomization pro PR in `hopps.cloud` + Eltern-Kustomization in `flux-multicluster` · (b) `helm upgrade` direkt aus GitHub Actions mit Kubeconfig-Secret | **(a)**, konsistent mit dev/demo/prod, kein Cluster-Zugang in GitHub |
| 2 | Zugang zu `flux-multicluster` | Manuel pflegt die Cluster-Änderungen selbst · Claude bekommt Lesezugriff/Schreibzugriff · Repo-Ausschnitt in den Workspace | Zugriff für Claude, sonst Übergabe als fertige YAML-Snippets |
| 3 | TLS | (A) Wildcard `*.preview.hopps.cloud` via DNS-01/Hetzner-API + Traefik-Default-Zertifikat · (B) HTTP-01 pro Host | **(A)** |
| 4 | Keycloak | eigener Keycloak pro Preview mit Realm-Import · geteilter dev-Keycloak | **eigener Keycloak** |
| 5 | Datei-Storage | PR #811 mergen und `HOPPS_STORAGE_TYPE=local` · geteilter DO-Spaces-Bucket `hopps-preview` · Bucket pro PR | **#811 + local** |
| 6 | Zugriffsschutz der Previews | keiner (wie dev) · Traefik `IPAllowList` mit deinen IPs · Basic-Auth nur auf SPA/Admin-Host · oauth2-proxy | **IPAllowList**, Liste als Flux-Variable in `cluster-secrets`; Hintergrund: Seed-User `alice/alice` plus echte Azure/OpenAI-Keys sind öffentlich erreichbar |
| 7 | Auslöser | Label `preview` (opt-in) · alle Nicht-Dependabot-PRs · Kommentar-Kommando `/preview` | **Label**, Claude setzt es beim PR-Anlegen |
| 8 | Parallelität | `MAX_PREVIEWS` 3 · 4 · dynamisch nach freiem RAM | **3**, mit PR-Kommentar bei Überschreitung |
| 9 | Claude-Runner | `claude-code-action` mit `ANTHROPIC_API_KEY` · mit `CLAUDE_CODE_OAUTH_TOKEN` (Subscription) · nur lokal | Action, Auth-Variante nach deinem Abrechnungsmodell |
| 10 | Push-Identität für Claude-Commits | GitHub App (empfohlen von Anthropic) · `TECHNICAL_USER_PAT` | GitHub App; PAT als schneller Start |
| 11 | Builds | alle 6 Images pro Preview-Lauf (exakte PR-Version, einfach) · nur geänderte Services, Rest von dev-Tags | **alle**, Pfadfilter später |
| 12 | Hostschema | `pr-123-api.preview.hopps.cloud` (eine Ebene, Wildcard-tauglich) · `api.pr-123.hopps.cloud` | **eine Ebene** |
| 13 | Preview-Testdaten | leere DB + Registrierung über UI · Seed über `%preview`-Profil/`TestdataBootstrapper` in Previews erlauben (Code-Änderung im org-Service, LaunchMode-Check aufweichen) | Seed erlauben, per Env `APP_HOPPS_TESTDATA_ENABLED=true` |

## 6. Risiken und offene Punkte

- **Cluster-Kapazität:** 20 GiB freier RAM auf einem Node. Previews konkurrieren mit dev/demo/prod und anderen Workloads (Minecraft, Kimai, Monitoring). Bei Bedarf Node-Upgrade oder Abschalten nicht benötigter Workloads.
- **Keycloak-Startzeit:** `start --import-realm` ohne `--optimized` baut beim Start (~60–90 s). Akzeptabel; Alternative wäre ein vorgebautes Theme-Image mit `kc.sh build` im Dockerfile.
- **Flux-Substitution in `kustomization.yaml`:** `${PR_NUMBER}` im `namespace:`-Feld wird erst nach dem Kustomize-Build ersetzt; funktioniert, weil Flux textuell auf das Ergebnis substituiert. Im Spike absichern.
- **Chart-Änderungen in PRs:** Prerelease-Charts landen in GHCR (`ghcr.io/hopps-app/hopps:0.2.11-pr123.*`). Regelmäßig löschen (GHCR-Retention über `actions/delete-package-versions` im `preview-gc.yml`).
- **Sicherheit:** Preview-Deploys nur für PRs aus dem eigenen Repo (kein `pull_request_target`). Die Overlay-Vorlage liegt in `hopps.cloud`, PR-Autoren steuern nur Image-Tags und Chart-Version. `kustomize-controller` wendet die Preview-Kustomizations mit Cluster-Admin an; als spätere Härtung `serviceAccountName` mit eingeschränkter Rolle.
- **Flux-Hygiene:** Die fehlgeschlagenen HelmReleases `traefik`, `minio`, `keycloak` sollten unabhängig davon aufgeräumt werden, damit `flux get all` wieder aussagekräftig ist.
- **Dependabot:** Dependabot-PRs nie automatisch previewen; bei Bedarf Label manuell setzen.
