# Kong Gateway Enterprise

## Generating Private Key and Digital Certificate
```
openssl req -new -x509 -nodes -newkey ec:<(openssl ecparam -name secp384r1) \
  -keyout ./cluster.key -out ./cluster.crt \
  -days 1095 -subj "/CN=kong_clustering"
```


## Control Plane

You have to have a Kong Gateway Enterprise license to properly install it. Please, contact [Kong's Sales Team](https://konghq.com/contact-sales) to get one.

```
kubectl create namespace kong-cp

kubectl create secret tls kong-cluster-cert --cert=./cluster.crt --key=./cluster.key -n kong-cp

kubectl create secret generic kong-enterprise-license -n kong-cp --from-file=./license
```

### Installation

The Control Plane installation uses the following [cp_values.yaml](../kong/cp_values.yaml) file.

```
helm repo add kong https://charts.konghq.com
helm repo update

helm install kong-cp kong/kong -n kong-cp --values ./cp_values.yaml
```


### Check CP's log
```
kubectl logs -f $(kubectl get pod -n kong-cp -o json | jq -r '.items[].metadata | select(.ownerReferences[0].kind == "ReplicaSet")' | jq -r '.name') -n kong-cp
```

### Consume the CP
```
export CONTROLPLANE_LB=$(kubectl get svc -n kong-cp kong-cp-kong-admin --output=jsonpath='{.status.loadBalancer.ingress[0].hostname}')
```

```
http $CONTROLPLANE_LB:8001 | jq -r '.version'
```


### Configuring Kong Manager Service
```
kubectl patch deployment -n kong-cp kong-cp-kong -p "{\"spec\": { \"template\" : { \"spec\" : {\"containers\":[{\"name\":\"proxy\",\"env\": [{ \"name\" : \"KONG_ADMIN_GUI_API_URL\", \"value\": \"$CONTROLPLANE_LB:8001\" }]}]}}}}"
```


### Logging to Kong Manager
```
export MANAGER_LB=$(kubectl get svc -n kong-cp kong-cp-kong-manager --output=jsonpath='{.status.loadBalancer.ingress[0].hostname}')


open -a "Google Chrome" "http://${MANAGER_LB}:8002"
```

## Data Plane

Kong Gateway Enterprise's Data Plane runs on a different EKS Node. So, le'ts create it:

### EKS Node
```
eksctl create nodegroup -f - <<EOF
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: kong310-eks132
  region: $AWS_DEFAULT_REGION

managedNodeGroups:
  - name: node-ai-gateway
    instanceType: c5.4xlarge
    amiFamily: AmazonLinux2023
    minSize: 1
    maxSize: 8
    ssh:
      publicKeyName: aig-benchmark
EOF
```

### Install Data Plane

```
kubectl create namespace kong-dp

kubectl create secret tls kong-cluster-cert --cert=./cluster.crt --key=./cluster.key -n kong-dp

kubectl create secret generic kong-enterprise-license -n kong-dp --from-file=./license
```

The Data Plane uses the [dp_values.yaml](../kong/dp_values.yaml) file:

```
helm install kong kong/kong -n kong-dp --values ./dp_values.yaml
```

#### NLB

As you can see, we instantiate an NLB using the ``service.beta.kubernetes.io/aws-load-balancer-nlb-target-type`` annotation in ``IP target mode``. From the [AWS Load Balancer documentation](https://kubernetes-sigs.github.io/aws-load-balancer-controller/v2.12/guide/service/annotations/#traffic-routing):

* <b>Instance mode</b> will route traffic to all EC2 instances within cluster on the NodePort opened for your service. The kube-proxy on the individual worker nodes sets up the forwarding of the traffic from the NodePort to the pods behind the service.

* <b>IP mode</b> will route traffic directly to the pod IP. In this mode, AWS NLB sends traffic directly to the Kubernetes pods behind the service, eliminating the need for an extra network hop through the worker nodes in the Kubernetes cluster.

#### Replica Count and CPU allocation
The declaration is set to spin up 3 replicas of the Data Plane, with ``nginx_worker_processes: "4"`` meaning that 4 CPUs will be allocate per replica so the Data Plane layer will have the total of 12 CPUs allocated.

The ``resources.limits`` setting prevents the Data Plane replica to allocate more than 4 CPUs.

#### Controlling the number of replicas

You can control the number of replicas using ``kubectl`` commands or chaging and applying the declaration again.

##### kubectl command
```
kubectl scale deployment kong-kong -n kong-dp --replicas=3
```

##### declaration file
```
helm upgrade kong kong/kong -n kong-dp --values ./dp_values.yaml
```


#### Check DP's logs
When running a single replica, you can check its logs with:

```
kubectl logs -f $(kubectl get pod -n kong-dp -o json | jq -r '.items[].metadata | select(.name | startswith("kong-"))' | jq -r '.name') -n kong-dp
```

#### Checking the Data Plane from the Control Plane
```
http $CONTROLPLANE_LB:8001/clustering/status
```

#### Checking the Proxy
Inside the K6's EC2 use the Internal NLB created during the deployment

```
export DATAPLANE_LB=$(kubectl get service -n kong-dp kong-kong-proxy --output=jsonpath='{.status.loadBalancer.ingress[0].hostname}')

http $DATAPLANE_LB
```


## Important observation: check the NLBs

Before accessing any deployment in EKS, make sure your Load Balancer is active and its target groups are healthy.

For example, first, get the NLB name running the following command. Choose the Namespace accordingly.
```
kubectl get service -n kong-dp -o json | jq -r '.items[].status.loadBalancer[][].hostname'
```
You should see a response like this:
```
k8s-kongdp-kongkong-0df4c97b4a-b778ee5a5d304634.elb.us-east-2.amazonaws.com
```

Now, check the NLB status with the following command.

```
aws elbv2 describe-load-balancers \
  --region $AWS_DEFAULT_REGION \
  --query "LoadBalancers[?Type=='network' && contains(LoadBalancerName, 'kongdp')]" | jq '.[].State'
```

The expected result should be:
```
{
  "Code": "active"
}
```

To check the NLB's target groups health status get the NLB ARN first.

```
NLB_ARN=$(aws elbv2 describe-load-balancers \
  --region $AWS_DEFAULT_REGION \
  --query "LoadBalancers[?Type=='network' && contains(LoadBalancerName, 'kongdp')]" | jq -r '.[].LoadBalancerArn')
```

And then check the target groups with:
```
for tg in $(aws elbv2 describe-target-groups \
              --region $AWS_DEFAULT_REGION \
              --load-balancer-arn $NLB_ARN \
              --query "TargetGroups[].TargetGroupArn" \
              --output text); do
  echo "Target Group: $tg"
  aws elbv2 describe-target-health \
    --region $AWS_DEFAULT_REGION \
    --target-group-arn $tg \
    --query "TargetHealthDescriptions[*].[Target.Id,TargetHealth.State]" \
    --output table
done
```
  
You should see a response similar to this. Note we have two target groups created, one per port defined in the Kubernetes Service, 80 and 443.

```
Target Group: arn:aws:elasticloadbalancing:us-east-2:<YOUR_AWS_ACCOUNT>:targetgroup/k8s-kongdp-kongkong-91d269e90f/36ca648868919bc2
-------------------------------
|    DescribeTargetHealth     |
+-----------------+-----------+
|  192.168.62.85  |  healthy  |
|  192.168.59.202 |  healthy  |
|  192.168.54.74  |  healthy  |
+-----------------+-----------+
Target Group: arn:aws:elasticloadbalancing:us-east-2:<YOUR_AWS_ACCOUNT>:targetgroup/k8s-kongdp-kongkong-f8d1a46564/8e53268897b88402
-------------------------------
|    DescribeTargetHealth     |
+-----------------+-----------+
|  192.168.62.85  |  healthy  |
|  192.168.59.202 |  healthy  |
|  192.168.54.74  |  healthy  |
+-----------------+-----------+
```

 And, since we have deployed the NLB with ``IP mode``, the target groups refer to the Pods' IP addresses. You can check them with:
```
kubectl get pod -n kong-dp -o json | jq -r '.items[].status.podIP'
````

Expect results:
```
192.168.62.85
192.168.54.74
192.168.59.202
```

