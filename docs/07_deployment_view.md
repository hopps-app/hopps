---
layout: default
title: "07. Deployment View"
description: "Infrastructure, Kubernetes, and deployment architecture"
---
# 7. Deployment View

This chapter describes how the Hopps platform is deployed to different environments using Docker and Kubernetes.

---

## Infrastructure Overview

```mermaid
C4Deployment
    title Hopps Platform - Deployment Overview

    Deployment_Node(k8s, "Kubernetes Cluster", "Production Environment") {
        Deployment_Node(ns, "hopps namespace") {
            Container(spa, "React SPA", "Nginx", "Static files")
            Container(main, "Main Service", "Quarkus", "3 replicas")
            Container(docai, "Document AI", "Quarkus", "2 replicas")
            Container(narrator, "Fin Narrator", "Quarkus", "2 replicas")
            Container(zugferd, "ZugFerd", "Quarkus", "2 replicas")
            Container(mail, "Mail Service", "Quarkus", "1 replica")
        }

        Deployment_Node(data, "Data Services") {
            ContainerDb(postgres, "PostgreSQL", "StatefulSet", "Persistent data")
            Container(kafka, "Kafka", "StatefulSet", "3 brokers")
            Container(keycloak, "Keycloak", "Deployment", "2 replicas")
        }
    }

    Deployment_Node(cloud, "AWS Cloud") {
        Container(s3, "S3 Bucket", "Object Storage", "Documents")
    }

    Rel(spa, main, "HTTPS/REST")
    Rel(main, docai, "HTTP")
    Rel(main, narrator, "HTTP")
    Rel(main, zugferd, "HTTP")
    Rel(main, mail, "HTTP")
    Rel(main, postgres, "JDBC")
    Rel(main, kafka, "Kafka Protocol")
    Rel(main, keycloak, "OIDC")
    Rel(main, s3, "S3 API")
```

---

## Level 1: Environment Overview

### Development Environment

**Purpose:** Local development on developer workstations

**Components:**
- Docker Compose for all services
- MinIO for S3 (S3-compatible)
- Local PostgreSQL
- Local Keycloak
- Local Kafka

**Configuration:**
```yaml
# infrastructure/hopps-app/docker-compose.yaml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: hopps
      POSTGRES_USER: hopps
      POSTGRES_PASSWORD: hopps
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data

  keycloak:
    image: quay.io/keycloak/keycloak:latest
    environment:
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: admin
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://postgres:5432/keycloak
    command: start-dev
    ports:
      - "8180:8080"
    depends_on:
      - postgres

  minio:
    image: minio/minio:latest
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio-data:/data

  kafka:
    image: confluentinc/cp-kafka:latest
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
    ports:
      - "9092:9092"
    depends_on:
      - zookeeper

  zookeeper:
    image: confluentinc/cp-zookeeper:latest
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
    ports:
      - "2181:2181"

volumes:
  postgres-data:
  minio-data:
```

**Usage:**
```bash
cd infrastructure/hopps-app
docker-compose up -d

# Check services
docker-compose ps

# View logs
docker-compose logs -f main-service
```

---

### Staging Environment

**Purpose:** Pre-production testing and QA

**Infrastructure:**
- Kubernetes cluster (small)
- RDS PostgreSQL (AWS)
- AWS S3
- Managed Kafka (AWS MSK or Confluent Cloud)
- Keycloak deployment

**Characteristics:**
- Similar to production but smaller
- Automated deployment from `develop` branch
- Database snapshots from production (anonymized)
- 1 replica per service

---

### Production Environment

**Purpose:** Live system serving real users

**Infrastructure:**
- Kubernetes cluster (HA)
- RDS PostgreSQL (Multi-AZ)
- AWS S3 with lifecycle policies
- Kafka cluster (3 brokers)
- Keycloak (HA mode)

**Characteristics:**
- High availability (multiple replicas)
- Auto-scaling enabled
- Monitoring and alerting
- Backup and disaster recovery
- TLS/SSL everywhere

---

## Level 2: Kubernetes Deployment

### Namespace Structure

```
Kubernetes Cluster
├── hopps-prod              # Production namespace
│   ├── Deployments
│   ├── Services
│   ├── Ingress
│   ├── ConfigMaps
│   └── Secrets
│
├── hopps-staging           # Staging namespace
│   └── (same structure)
│
└── hopps-monitoring        # Monitoring namespace
    ├── Prometheus
    ├── Grafana
    └── Loki
```

---

### Deployment: Main Service

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hopps-main
  namespace: hopps-prod
  labels:
    app: hopps-main
    version: 1.0.0
spec:
  replicas: 3
  selector:
    matchLabels:
      app: hopps-main
  template:
    metadata:
      labels:
        app: hopps-main
        version: 1.0.0
    spec:
      containers:
      - name: hopps-main
        image: registry.hopps.app/hopps-main:1.0.0
        imagePullPolicy: IfNotPresent

        ports:
        - name: http
          containerPort: 8080
          protocol: TCP

        env:
        - name: QUARKUS_DATASOURCE_JDBC_URL
          valueFrom:
            configMapKeyRef:
              name: hopps-config
              key: database.url
        - name: QUARKUS_DATASOURCE_USERNAME
          valueFrom:
            secretKeyRef:
              name: hopps-secrets
              key: database.username
        - name: QUARKUS_DATASOURCE_PASSWORD
          valueFrom:
            secretKeyRef:
              name: hopps-secrets
              key: database.password
        - name: QUARKUS_OIDC_AUTH_SERVER_URL
          valueFrom:
            configMapKeyRef:
              name: hopps-config
              key: keycloak.url
        - name: AWS_ACCESS_KEY_ID
          valueFrom:
            secretKeyRef:
              name: hopps-secrets
              key: aws.access-key
        - name: AWS_SECRET_ACCESS_KEY
          valueFrom:
            secretKeyRef:
              name: hopps-secrets
              key: aws.secret-key

        resources:
          requests:
            memory: "256Mi"
            cpu: "500m"
          limits:
            memory: "512Mi"
            cpu: "1000m"

        livenessProbe:
          httpGet:
            path: /q/health/live
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 3
          failureThreshold: 3

        readinessProbe:
          httpGet:
            path: /q/health/ready
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3

      restartPolicy: Always
```

---

### Service: Main Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: hopps-main
  namespace: hopps-prod
  labels:
    app: hopps-main
spec:
  type: ClusterIP
  ports:
  - name: http
    port: 8080
    targetPort: 8080
    protocol: TCP
  selector:
    app: hopps-main
```

---

### Ingress Configuration

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: hopps-ingress
  namespace: hopps-prod
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/rate-limit: "100"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - app.hopps.app
    - api.hopps.app
    secretName: hopps-tls

  rules:
  # Frontend SPA
  - host: app.hopps.app
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: hopps-spa
            port:
              number: 80

  # Backend API
  - host: api.hopps.app
    http:
      paths:
      - path: /organizations
        pathType: Prefix
        backend:
          service:
            name: hopps-main
            port:
              number: 8080
      - path: /bommels
        pathType: Prefix
        backend:
          service:
            name: hopps-main
            port:
              number: 8080
      - path: /categories
        pathType: Prefix
        backend:
          service:
            name: hopps-main
            port:
              number: 8080
      - path: /documents
        pathType: Prefix
        backend:
          service:
            name: hopps-main
            port:
              number: 8080
      - path: /transaction-records
        pathType: Prefix
        backend:
          service:
            name: hopps-main
            port:
              number: 8080
```

---

### ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: hopps-config
  namespace: hopps-prod
data:
  # Database
  database.url: "jdbc:postgresql://hopps-postgres.cxxxxx.eu-central-1.rds.amazonaws.com:5432/hopps"

  # Keycloak
  keycloak.url: "https://auth.hopps.app/realms/hopps"

  # S3
  s3.bucket: "hopps-documents-prod"
  s3.region: "eu-central-1"

  # Kafka
  kafka.bootstrap.servers: "kafka-1.hopps.internal:9092,kafka-2.hopps.internal:9092,kafka-3.hopps.internal:9092"

  # Service URLs
  document-ai.url: "http://hopps-document-ai:8080"
  fin-narrator.url: "http://hopps-fin-narrator:8080"
  zugferd.url: "http://hopps-zugferd:8080"
  mail-service.url: "http://hopps-mail:8080"

  # Application
  app.environment: "production"
  app.log-level: "INFO"
```

---

### Secrets

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: hopps-secrets
  namespace: hopps-prod
type: Opaque
stringData:
  # Database credentials (base64 encoded in real deployment)
  database.username: "hopps_app"
  database.password: "changeme"

  # AWS credentials
  aws.access-key: "AKIAIOSFODNN7EXAMPLE"
  aws.secret-key: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"

  # Keycloak client secret
  keycloak.client-secret: "secret-value"

  # SMTP credentials
  smtp.username: "smtp-user"
  smtp.password: "smtp-password"
```

**Note:** Secrets managed via sealed-secrets or external secrets operator in production.

---

### HorizontalPodAutoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: hopps-main-hpa
  namespace: hopps-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: hopps-main
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
      - type: Pods
        value: 2
        periodSeconds: 30
```

---

## Level 3: PostgreSQL Deployment

### StatefulSet (Kubernetes Internal)

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: hopps-prod
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        ports:
        - containerPort: 5432
          name: postgres
        env:
        - name: POSTGRES_DB
          value: hopps
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: username
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: gp3
      resources:
        requests:
          storage: 100Gi
```

### AWS RDS (Production)

**Configuration:**
- **Instance Type:** db.t3.medium (2 vCPU, 4 GB RAM)
- **Multi-AZ:** Enabled for high availability
- **Storage:** 100 GB GP3 with auto-scaling to 500 GB
- **Backup:** Daily automated backups, 7-day retention
- **Encryption:** At rest with AWS KMS
- **Parameter Group:** Custom with optimized settings

**Connection:**
```yaml
# ConfigMap
database.url: "jdbc:postgresql://hopps-prod.cxxxxx.eu-central-1.rds.amazonaws.com:5432/hopps"
```

**Monitoring:**
- CloudWatch metrics (CPU, memory, connections, I/O)
- Enhanced monitoring (1-minute granularity)
- Performance Insights enabled
- Slow query log to CloudWatch Logs

---

## Level 4: Kafka Deployment

### Kubernetes (StatefulSet)

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: kafka
  namespace: hopps-prod
spec:
  serviceName: kafka-headless
  replicas: 3
  selector:
    matchLabels:
      app: kafka
  template:
    metadata:
      labels:
        app: kafka
    spec:
      containers:
      - name: kafka
        image: confluentinc/cp-kafka:7.5.0
        ports:
        - containerPort: 9092
          name: client
        - containerPort: 9093
          name: internal
        env:
        - name: KAFKA_BROKER_ID
          valueFrom:
            fieldRef:
              fieldPath: metadata.labels['statefulset.kubernetes.io/pod-name']
        - name: KAFKA_ZOOKEEPER_CONNECT
          value: zookeeper:2181
        - name: KAFKA_ADVERTISED_LISTENERS
          value: "INTERNAL://$(POD_NAME).kafka-headless:9093,EXTERNAL://$(POD_NAME).kafka.hopps.internal:9092"
        - name: KAFKA_LISTENER_SECURITY_PROTOCOL_MAP
          value: "INTERNAL:PLAINTEXT,EXTERNAL:PLAINTEXT"
        - name: KAFKA_INTER_BROKER_LISTENER_NAME
          value: INTERNAL
        volumeMounts:
        - name: kafka-storage
          mountPath: /var/lib/kafka/data
  volumeClaimTemplates:
  - metadata:
      name: kafka-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: gp3
      resources:
        requests:
          storage: 50Gi
```

### AWS MSK (Production Alternative)

**Configuration:**
- **Cluster Type:** Provisioned
- **Broker Type:** kafka.m5.large (3 brokers)
- **Storage:** 100 GB per broker with auto-scaling
- **Encryption:** In transit and at rest
- **Monitoring:** CloudWatch metrics + Prometheus

---

## CI/CD Pipeline

### Pipeline Stages

```mermaid
graph LR
    A[Git Push] --> B[Maven Build]
    B --> C[Unit Tests]
    C --> D[Integration Tests]
    D --> E[SonarQube]
    E --> F[Docker Build]
    F --> G[Push to Registry]
    G --> H{Branch?}

    H -->|main| I[Deploy to Staging]
    H -->|release| J[Deploy to Production]

    I --> K[Smoke Tests]
    J --> L[Smoke Tests]

    K --> M[Notify Slack]
    L --> M
```

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches: [main, release]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up JDK 21
        uses: actions/setup-java@v3
        with:
          java-version: '21'
          distribution: 'temurin'

      - name: Cache Maven packages
        uses: actions/cache@v3
        with:
          path: ~/.m2
          key: ${{ runner.os }}-m2-${{ hashFiles('**/pom.xml') }}

      - name: Build with Maven
        run: ./mvnw clean package -DskipTests

      - name: Run tests
        run: ./mvnw test

      - name: Run integration tests
        run: ./mvnw verify

      - name: SonarQube Scan
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
        run: |
          ./mvnw sonar:sonar \
            -Dsonar.host.url=https://sonarcloud.io \
            -Dsonar.organization=hopps \
            -Dsonar.projectKey=hopps-main

      - name: Build Docker image
        run: docker build -t hopps-main:${{ github.sha }} .

      - name: Push to registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker tag hopps-main:${{ github.sha }} registry.hopps.app/hopps-main:${{ github.sha }}
          docker push registry.hopps.app/hopps-main:${{ github.sha }}

  deploy-staging:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to staging
        run: |
          kubectl set image deployment/hopps-main \
            hopps-main=registry.hopps.app/hopps-main:${{ github.sha }} \
            -n hopps-staging

      - name: Wait for rollout
        run: kubectl rollout status deployment/hopps-main -n hopps-staging

  deploy-production:
    needs: build
    if: github.ref == 'refs/heads/release'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: |
          kubectl set image deployment/hopps-main \
            hopps-main=registry.hopps.app/hopps-main:${{ github.sha }} \
            -n hopps-prod

      - name: Wait for rollout
        run: kubectl rollout status deployment/hopps-main -n hopps-prod

      - name: Slack notification
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: "Deployed hopps-main:${{ github.sha }} to production"
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

---

## Monitoring and Observability

### Prometheus Metrics

**Exposed by Quarkus:**
- `/q/metrics` - Prometheus format metrics

**Key Metrics:**
- `http_server_requests_seconds` - Request duration
- `jvm_memory_used_bytes` - JVM memory usage
- `jvm_threads_live` - Thread count
- `database_pool_connections` - Connection pool size

### Grafana Dashboards

**Backend Dashboard:**
- Request rate (requests/second)
- Error rate (%)
- Response time (p50, p95, p99)
- JVM memory and GC
- Database connection pool

**Business Metrics:**
- Organizations created/day
- Documents uploaded/hour
- Active users
- Transaction volume

### Logging

**Structured JSON Logging:**
```json
{
  "timestamp": "2024-11-12T10:30:00Z",
  "level": "INFO",
  "logger": "app.hopps.organization.api.OrganizationResource",
  "message": "Organization created",
  "context": {
    "organizationId": 123,
    "userId": "user-456",
    "duration_ms": 250
  }
}
```

**Log Aggregation:**
- Loki for log storage
- Grafana for log querying
- Alert rules for errors

---

## Backup and Disaster Recovery

### Database Backups

**Automated Backups:**
- Daily full backup to S3
- Point-in-time recovery (PITR) with WAL archiving
- 30-day retention

**Manual Backups:**
```bash
# Create backup
kubectl exec -it postgres-0 -- pg_dump -U hopps hopps > backup.sql

# Restore backup
kubectl exec -i postgres-0 -- psql -U hopps hopps < backup.sql
```

### S3 Backups

**Versioning:** Enabled on all buckets
**Lifecycle Policy:**
- Transition to S3-IA after 90 days
- Transition to Glacier after 1 year
- Delete after 10 years (legal retention)

### Disaster Recovery Plan

**RTO (Recovery Time Objective):** 1 hour
**RPO (Recovery Point Objective):** 5 minutes

**Procedure:**
1. Restore database from latest backup
2. Restore S3 from versioning/replication
3. Redeploy applications from container registry
4. Verify functionality with smoke tests
5. Switch DNS to DR environment

---

## Scaling Strategy

### Horizontal Scaling

**Main Service:**
- Min replicas: 3
- Max replicas: 10
- Scale up: CPU > 70% or Memory > 80%
- Scale down: After 5 minutes of low utilization

**Database:**
- Read replicas for read-heavy queries
- Connection pooling (max 16 connections per instance)

**S3:**
- Automatically scales (no configuration needed)

### Vertical Scaling

**When to scale up:**
- Persistent high CPU/memory usage
- Database CPU > 80% sustained
- Increase instance size (t3.medium → t3.large)

---

## Security Configuration

### Network Policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: hopps-main-policy
  namespace: hopps-prod
spec:
  podSelector:
    matchLabels:
      app: hopps-main
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: ingress-nginx
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432
  - to:
    - podSelector:
        matchLabels:
          app: kafka
    ports:
    - protocol: TCP
      port: 9092
```

### Pod Security Standards

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: hopps-main
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 1000
  containers:
  - name: hopps-main
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop:
        - ALL
```

---

## Summary

The Hopps platform deployment strategy provides:

1. **Multi-Environment:** Development (Docker Compose), Staging, Production (Kubernetes)
2. **High Availability:** Multiple replicas, auto-scaling, health checks
3. **Scalability:** Horizontal pod autoscaling, database read replicas
4. **Security:** Network policies, secrets management, TLS everywhere
5. **Observability:** Prometheus metrics, Grafana dashboards, structured logging
6. **CI/CD:** Automated pipeline from code to production
7. **Disaster Recovery:** Automated backups, documented recovery procedures

---

**Document Version:** 1.0
**Last Updated:** 2025-11-12
**Status:** Active
