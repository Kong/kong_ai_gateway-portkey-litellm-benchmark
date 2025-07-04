# AWS and EKS

## AWS Region
If necessary, set your default AWS region. This variable will be used in several scripts.

```
export AWS_DEFAULT_REGION=<your region>
```

## EKS Cluster Creation and Tools Node

Initially, the EKS Cluster has a single Node where we are going to install the tools and controller necessary for the benchmark including
* AWS Load Balancer Controller
* EBS CSI Driver add-on
* Prometheus

Create an AWS Key Pair to be able to login to the Node if needed.

```
aws ec2 create-key-pair \
    --key-name aig-benchmark \
    --key-type rsa \
    --key-format pem \
    --query "KeyMaterial" \
    --output text > aig-benchmark.pem

chmod 400 aig-benchmark.pem
```

Create the EKS cluster. Ensure you use the ssh key you created above, or replace it with your own ssh key. This ssh key will be needed in later steps.

```
eksctl create cluster -f - <<EOF
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: kong310-eks132
  region: $AWS_DEFAULT_REGION
  version: "1.32"

managedNodeGroups:
  - name: node-tools
    instanceType: c5.xlarge
    minSize: 1
    maxSize: 8
    ssh:
      publicKeyName: aig-benchmark
EOF
```



## Pod Identity

EKS Pod Identity is used to manage the Load Balancerd Controller and EBS CSI Driver Add-On.

```
eksctl create addon --cluster kong310-eks132 \
  --region $AWS_DEFAULT_REGION \
  --name eks-pod-identity-agent
```

## Check the Add-Ons

Before using any Add-On make sure they are ``ACTIVE``:

```
eksctl get addons --cluster kong310-eks132 --region $AWS_DEFAULT_REGION
```


## AWS Load Balancer Controller

To learn mode about the AWS Load Balancer Controller read its [documentation](https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/)


```
curl -O https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.13.2/docs/install/iam_policy.json
```

```
aws iam create-policy \
    --policy-name AIGBenchmarkLoadBalancerPolicy \
    --policy-document file://iam_policy.json
```


### Install AWS Load Balancer Controller

Use your AWS account to install the Load Balancer Controller

```
eksctl create podidentityassociation \
    --cluster kong310-eks132 \
    --region $AWS_DEFAULT_REGION \
    --namespace kube-system \
    --service-account-name aws-load-balancer-controller \
    --role-name AIGBenchmarkLoadBalancerControllerIAMRole-kong310-eks132 \
    --permission-policy-arns arn:aws:iam::<YOUR_AWS_ACCOUNT_ID>:policy/AIGBenchmarkLoadBalancerPolicy
```

```
helm install aws-load-balancer-controller eks/aws-load-balancer-controller -n kube-system \
  --set clusterName=kong310-eks132 \
  --set region=$AWS_DEFAULT_REGION \
  --set serviceAccount.create=true \
  --set serviceAccount.name=aws-load-balancer-controller
```


## EBS CSI Driver add-on

EBS CSI Driver is required to deploy the Kong Gateway Enterprise database.

```
eksctl create addon --cluster kong310-eks132 \
  --region $AWS_DEFAULT_REGION \
  --name aws-ebs-csi-driver
```

```
eksctl update addon -f - <<EOF
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig
metadata:
  name: kong310-eks132
  region: $AWS_DEFAULT_REGION
addons:
- name: aws-ebs-csi-driver
  podIdentityAssociations:
  - serviceAccountName: ebs-csi-controller-sa
    namespace: kube-system
    permissionPolicyARNs:
    - arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy
EOF
```

## kubectl

In order to perform kubectl operations, you will need to set your config to the newly created cluster. You may want to backup your existing configs first.

```
aws eks update-kubeconfig --region $AWS_DEFAULT_REGION --name kong310-eks132
```

## Prometheus

````
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
````


```
helm install prometheus -n prometheus prometheus-community/kube-prometheus-stack \
--create-namespace \
--set alertmanager.enabled=false \
--set prometheus.prometheusSpec.maximumStartupDurationSeconds=300 \
--set grafana.service.type=LoadBalancer \
--set grafana.service.annotations."service\.beta\.kubernetes\.io/aws-load-balancer-scheme"="internet-facing" \
--set grafana.service.annotations."service\.beta\.kubernetes\.io/aws-load-balancer-nlb-target-type"="ip"
```

```
GRAFANA_LB=$(kubectl get service prometheus-grafana -n prometheus -o json | jq -r '.status.loadBalancer.ingress[].hostname')

open -a "Google Chrome" "http://${GRAFANA_LB}"
```

To login use Prometheus Stack credentials:
* User ID: ``admin``
* Password: ``prom-operator``
