# Rybbit Helm Chart

This Helm chart deploys the Rybbit self-hosted analytics platform on Kubernetes.

## Prerequisites

- Kubernetes 1.19+
- Helm 3.2.0+
- PV provisioner support in the underlying infrastructure

## Installation

### Using OCI Registry

The chart is available in our OCI registry. To install:

```bash
# Install the chart
helm install rybbit oci://harbor.lag0.com.br/library/rybbit
```

Or install with custom values:

```bash
helm install rybbit oci://harbor.lag0.com.br/library/rybbit -f values.yaml
```

## Configuration

The following table lists the configurable parameters of the Rybbit chart and their default values.

### Backend Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `backend.image.repository` | Backend image repository | `ghcr.io/rybbit-io/rybbit-backend` |
| `backend.image.tag` | Backend image tag | `latest` |
| `backend.image.pullPolicy` | Backend image pull policy | `IfNotPresent` |
| `backend.replicaCount` | Number of backend replicas | `1` |
| `backend.resources` | Backend pod resource requests and limits | See values.yaml |
| `backend.env` | Backend environment variables | See values.yaml |

### Client Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `client.image.repository` | Client image repository | `ghcr.io/rybbit-io/rybbit-client` |
| `client.image.tag` | Client image tag | `latest` |
| `client.image.pullPolicy` | Client image pull policy | `IfNotPresent` |
| `client.replicaCount` | Number of client replicas | `1` |
| `client.resources` | Client pod resource requests and limits | See values.yaml |
| `client.env` | Client environment variables | See values.yaml |

### PostgreSQL Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `postgres.image.repository` | PostgreSQL image repository | `postgres` |
| `postgres.image.tag` | PostgreSQL image tag | `17.4` |
| `postgres.image.pullPolicy` | PostgreSQL image pull policy | `IfNotPresent` |
| `postgres.replicaCount` | Number of PostgreSQL replicas | `1` |
| `postgres.resources` | PostgreSQL pod resource requests and limits | See values.yaml |
| `postgres.user` | PostgreSQL username | `frog` |
| `postgres.password` | PostgreSQL password | Randomly generated |
| `postgres.db` | PostgreSQL database name | `analytics` |
| `postgres.persistence.enabled` | Enable PostgreSQL persistence | `true` |
| `postgres.persistence.storageClass` | Storage class for PostgreSQL PVC | `""` |
| `postgres.persistence.accessMode` | Access mode for PostgreSQL PVC | `ReadWriteOnce` |
| `postgres.persistence.size` | Size of PostgreSQL PVC | `10Gi` |
| `postgres.persistence.annotations` | Annotations for PostgreSQL PVC | `{}` |

### ClickHouse Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `clickhouse.image.repository` | ClickHouse image repository | `clickhouse/clickhouse-server` |
| `clickhouse.image.tag` | ClickHouse image tag | `25.4.2` |
| `clickhouse.image.pullPolicy` | ClickHouse image pull policy | `IfNotPresent` |
| `clickhouse.replicaCount` | Number of ClickHouse replicas | `1` |
| `clickhouse.resources` | ClickHouse pod resource requests and limits | See values.yaml |
| `clickhouse.user` | ClickHouse username | `default` |
| `clickhouse.password` | ClickHouse password | Randomly generated |
| `clickhouse.db` | ClickHouse database name | `analytics` |
| `clickhouse.persistence.enabled` | Enable ClickHouse persistence | `true` |
| `clickhouse.persistence.storageClass` | Storage class for ClickHouse PVC | `""` |
| `clickhouse.persistence.accessMode` | Access mode for ClickHouse PVC | `ReadWriteOnce` |
| `clickhouse.persistence.size` | Size of ClickHouse PVC | `20Gi` |
| `clickhouse.persistence.annotations` | Annotations for ClickHouse PVC | `{}` |

### Ingress Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `ingress.enabled` | Enable ingress | `false` |
| `ingress.className` | Ingress class name | `""` |
| `ingress.annotations` | Ingress annotations | `{}` |
| `ingress.hosts` | Ingress hosts configuration | See values.yaml |
| `ingress.tls` | Ingress TLS configuration | `[]` |

## Security

### Password Management

The chart automatically generates random passwords for PostgreSQL and ClickHouse on first installation. These passwords are stored in a Kubernetes Secret and will be preserved across upgrades unless explicitly changed in values.yaml.

To set custom passwords, add them to your values.yaml:

```yaml
postgres:
  password: "your-custom-password"

clickhouse:
  password: "your-custom-password"
```

### Authentication Secret

The backend uses a secret for authentication. This is automatically generated on first installation and preserved across upgrades. To set a custom secret:

```yaml
backend:
  env:
    BETTER_AUTH_SECRET: "your-custom-secret"
```

## Upgrading

To upgrade the release:

```bash
helm upgrade rybbit oci://harbor.lag0.com.br/library/rybbit
```

Or upgrade with custom values:

```bash
helm upgrade rybbit oci://harbor.lag0.com.br/library/rybbit -f values.yaml
```

## Uninstalling

To uninstall/delete the deployment:

```bash
helm uninstall rybbit
```

## Persistence

The chart creates PersistentVolumeClaims for both PostgreSQL and ClickHouse data. You can configure the persistence settings for each database:

```yaml
postgres:
  persistence:
    enabled: true
    storageClass: "standard"  # Use your preferred storage class
    accessMode: ReadWriteOnce
    size: 10Gi
    annotations:
      custom-annotation: value

clickhouse:
  persistence:
    enabled: true
    storageClass: "standard"  # Use your preferred storage class
    accessMode: ReadWriteOnce
    size: 20Gi
    annotations:
      custom-annotation: value
```

Key persistence options:
- `enabled`: Enable/disable persistence
- `storageClass`: Specify the storage class to use (empty string means use default)
- `accessMode`: Access mode for the PVC (ReadWriteOnce, ReadWriteMany, ReadOnlyMany)
- `size`: Size of the persistent volume
- `annotations`: Custom annotations for the PVC

## Ingress

The chart supports ingress configuration for exposing the application. To enable ingress:

```yaml
ingress:
  enabled: true
  className: "nginx"
  annotations:
    kubernetes.io/ingress.class: nginx
  hosts:
    - host: your-domain.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: your-domain-tls
      hosts:
        - your-domain.com
```

## Troubleshooting

### Common Issues

1. **Database Connection Issues**
   - Verify that the database passwords in the secret match your configuration
   - Check that the database services are running and accessible

2. **Ingress Issues**
   - Ensure your ingress controller is properly configured
   - Verify that the ingress annotations match your ingress controller requirements

3. **Resource Issues**
   - Check if pods are being scheduled (kubectl get pods)
   - Verify resource requests and limits are appropriate for your cluster

## Support

For support, please open an issue in the [GitHub repository](https://github.com/rybbit-io/rybbit). 