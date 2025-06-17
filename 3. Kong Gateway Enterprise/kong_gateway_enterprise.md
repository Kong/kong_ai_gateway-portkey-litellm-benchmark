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

The Control Plane install uses the following [cp_values.yaml](../kong/cp_values.yaml) file.

```
helm install kong-cp kong/kong -n kong-cp --values ./cp_values.yaml
```


### Check CP's log
```
kubectl logs -f $(kubectl get pod -n kong-cp -o json | jq -r '.items[].metadata | select(.ownerReferences[0].kind == "ReplicaSet")' | jq -r '.name') -n kong-cp
```

### Consume the CP
```
export CONTROLPLANE_LB=$(kubectl get svc -n kong-cp kong-cp-kong-admin --output=jsonpath='{.status.loadBalancer.ingress[0].hostname}')

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
  region: us-east-2

managedNodeGroups:
  - name: node-ai-gateway
    instanceType: c5.4xlarge
    amiFamily: AmazonLinux2023
    minSize: 1
    maxSize: 8
    ssh:
      publicKeyName: acquaviva-us-east-2
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

As you can see, we instantiate an NLB using the ``service.beta.kubernetes.io/aws-load-balancer-nlb-target-type`` annotation in ``IP target mode``. From the [AWS Load Balancer documentation](https://kubernetes-sigs.github.io/aws-load-balancer-controller/v2.12/guide/service/annotations/#traffic-routing):

* Instance mode
Instance mode will route traffic to all EC2 instances within cluster on the NodePort opened for your service. The kube-proxy on the individual worker nodes sets up the forwarding of the traffic from the NodePort to the pods behind the service.

* IP mode
IP mode will route traffic directly to the pod IP. In this mode, AWS NLB sends traffic directly to the Kubernetes pods behind the service, eliminating the need for an extra network hop through the worker nodes in the Kubernetes cluster.



#### Check DP's logs

```
kubectl logs -f $(kubectl get pod -n kong-dp -o json | jq -r '.items[].metadata | select(.name | startswith("kong-"))' | jq -r '.name') -n kong-dp
```

#### Checking the Data Plane from the Control Plane
http $CONTROLPLANE_LB:8001/clustering/status


#### Checking the Proxy
Inside the K6's EC2 use the Internal NLB created during the deployment

```
export DATAPLANE_LB=$(kubectl get service -n kong-dp kong-kong-proxy --output=jsonpath='{.status.loadBalancer.ingress[0].hostname}')

http $DATAPLANE_LB
```
