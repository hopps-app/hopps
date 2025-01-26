locals {
  project_tags = {
    "terraform" = "true"
  }
}

provider "aws" {
  region = "eu-central-1"

  #shared_config_files = ["~/.aws/config"]
  #profile = "oidc"
}

provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  token                  = data.aws_eks_cluster_auth.main.token
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
}

provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    token                  = data.aws_eks_cluster_auth.main.token
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
  }
}

data "aws_eks_cluster_auth" "main" {
  name = module.eks.cluster_name
}


# Filter out local zones, which are not currently supported
# with managed node groups
data "aws_availability_zones" "available" {
  filter {
    name   = "opt-in-status"
    values = ["opt-in-not-required"]
  }
}

# We need to create EIPs for the NAT Gateways, so we can reference them in the NAT Gateway configuration
# The VPC Module can provide these autoamticlly but it's better to create them outside, so we can use them elsewhere. If we decided to tear this module down.
resource "aws_eip" "eu-central-nat" {
  count = 3

  domain = "vpc"

  tags = merge(local.project_tags, {
    Name = "eks-vpc-eu-central-1-nat-${count.index}"
  })
}

# Create VPC
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  version = "5.8.1"
  name = "hopps-vpc"
  cidr = "10.0.0.0/16"
  azs  = slice(data.aws_availability_zones.available.names, 0, 3)

  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.4.0/24", "10.0.5.0/24", "10.0.6.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true
  enable_dns_hostnames = true
  enable_dns_support = true
  reuse_nat_ips = true
  external_nat_ip_ids = aws_eip.eu-central-nat.*.id

  public_subnet_tags = {
    "kubernetes.io/role/elb" = 1
  }
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = 1
  }
}

# Create EKS Cluster
module "eks" {
  source = "terraform-aws-modules/eks/aws"
  # ToDo: make version updateable with renovate or dependabot
  version = "20.8.5"
  cluster_name = "cilium-eks-cluster"
  cluster_version = "1.32"

  cluster_endpoint_public_access           = true
  enable_cluster_creator_admin_permissions = true

  # connect vpc with eks
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  eks_managed_node_groups = {
    one = {
      name = "node-group-t3small"
      instance_types = ["t3.small"]
      min_size     = 1
      max_size     = 1
      desired_size = 1
    }
  }
}

resource "helm_release" "prometheus-operator-crds" {
  chart = "prometheus-operator-crds"
  name  = "prometheus-operator-crds"
  namespace = "kube-system"
  version = "17.0.2"
  repository = "https://prometheus-community.github.io/helm-charts"
}

# Install cilium with helm
resource "helm_release" "cilium" {
  depends_on = [helm_release.prometheus-operator-crds]
  name = "cilium"
  chart = "cilium"
  namespace = "cilium"
  repository = "https://helm.cilium.io"
  create_namespace = true
  version = "1.16.6"
  values = [
    <<EOF
    cluster:
      name: hopps
      id: 1
    operator:
      replicas: 1
      prometheus:
        serviceMonitor:
          enabled: true
      dashboards:
        enabled: true
    # replace kube-proxy
    kubeProxyReplacement: "true"
    k8sServiceHost: "EE611DA59B547404BE478821BC3867BB.gr7.eu-central-1.eks.amazonaws.com"
    k8sServicePort: "443"
    cni:
      chainingMode: aws-cni
      exclusive: false
    enableIPv4Masquerade: false
    routingMode: native
    endpointRoutes:
      enabled: true
    bandwidthManager:
      enabled: true
    hubble:
      enabled: true
      metrics:
        enabled:
          - dns:query;ignoreAAAA
          - drop
          - tcp
          - flow
          - icmp
          - http
          #- httpV2
          #- port-distribution
        serviceMonitor:
          # -- Create ServiceMonitor resources for Prometheus Operator.
          # This requires the prometheus CRDs to be available.
          # ref: https://github.com/prometheus-operator/prometheus-operator/blob/main/example/prometheus-operator-crd/monitoring.coreos.com_servicemonitors.yaml)
          enabled: true
        dashboards:
          enabled: true
    relay:
      enabled: true
      prometheus:
        enabled: true
        serviceMonitor:
          enabled: true
    prometheus:
      enabled: true
      serviceMonitor:
        enabled: true
    dashboards:
      enabled: true
    EOF
  ]
}

resource "helm_release" "flux-operator" {
  depends_on = [helm_release.cilium]
  chart = "flux-operator"
  name  = "flux-operator"
  namespace = "flux-system"
  create_namespace = true
  version = "0.13.0"
  repository = "oci://ghcr.io/controlplaneio-fluxcd/charts"
  values = [
    <<EOF
    serviceMonitor:
      create: true
    resources:
      limits:
        cpu: 200m
        memory: 256Mi
      requests:
        cpu: 100m
        memory: 128Mi
    EOF
  ]
}

resource "kubernetes_manifest" "flux-instance" {
  depends_on = [helm_release.flux-operator]
  manifest = yamldecode(file("${path.module}/flux.yaml"))
}
