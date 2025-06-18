# AWS and EKS

## EKS Cluster Creation and Tools Node

Initially, the EKS Cluster has a single Node where we are going to install the tools and controller necessary for the benchmark including
* AWS Load Balancer Controller
* EBS CSI Driver add-on
* Prometheus

Create an AWS Key Pair to be able to login to the Node if needed.

```
eksctl create cluster -f - <<EOF
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: kong310-eks132
  region: us-east-2
  version: "1.32"

managedNodeGroups:
  - name: node-tools
    instanceType: c5.xlarge
    minSize: 1
    maxSize: 8
    ssh:
      publicKeyName: acquaviva-us-east-2
EOF
```



## Pod Identity

EKS Pod Identity is used to manage the Load Balancerd Controller and EBS CSI Driver Add-On.

```
eksctl create addon --cluster kong310-eks132 \
  --region us-east-2 \
  --name eks-pod-identity-agent
```

## Check the Add-Ons

Before installing any Add-On make sure they are ``ACTIVE``:

```
eksctl get addons --cluster kong310-eks132 --region us-east-2
```


## AWS Load Balancer Controller

To learn mode about the AWS Load Balancer Controller read its [documentation](https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/)


```
curl -O https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.13.2/docs/install/iam_policy.json
```

```
aws iam create-policy \
    --policy-name AWSLoadBalancerControllerIAMPolicy \
    --policy-document file://iam_policy.json
```


### Install AWS Load Balancer Controller

Use your AWS account to install the Load Balancer Controller

```
eksctl create podidentityassociation \
    --cluster kong310-eks132 \
    --region us-east-2 \
    --namespace kube-system \
    --service-account-name aws-load-balancer-controller \
    --role-name AWSLoadBalancerControllerIAMRole-kong310-eks132 \
    --permission-policy-arns arn:aws:iam::<YOUR_AWS_ACCOUNT_ID>:policy/AWSLoadBalancerControllerIAMPolicy
```

```
helm install aws-load-balancer-controller eks/aws-load-balancer-controller -n kube-system \
  --set clusterName=kong310-eks132 \
  --set region=us-east-2 \
  --set serviceAccount.create=true \
  --set serviceAccount.name=aws-load-balancer-controller
```


## EBS CSI Driver add-on

EBS CSI Driver is required to deploy the Kong Gateway Enterprise database.

```
eksctl create addon --cluster kong310-eks132 \
  --region us-east-2 \
  --name aws-ebs-csi-driver
```

```
eksctl update addon -f - <<EOF
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig
metadata:
  name: kong310-eks132
  region: us-east-2
addons:
- name: aws-ebs-csi-driver
  podIdentityAssociations:
  - serviceAccountName: ebs-csi-controller-sa
    namespace: kube-system
    permissionPolicyARNs:
    - arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy
EOF
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
