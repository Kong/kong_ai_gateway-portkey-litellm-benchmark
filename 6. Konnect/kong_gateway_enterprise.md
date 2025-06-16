# Kong Gateway Enterprise

## Generating Private Key and Digital Certificate
```
openssl req -new -x509 -nodes -newkey ec:<(openssl ecparam -name secp384r1) \
  -keyout ./cluster.key -out ./cluster.crt \
  -days 1095 -subj "/CN=kong_clustering"
```


## Control Plane

```
helm uninstall kong-cp -n kong-cp
kubectl delete pvc data-kong-cp-postgresql-0 -n kong-cp
kubectl delete namespace kong-cp

kubectl create namespace kong-cp

kubectl create secret tls kong-cluster-cert --cert=./cluster.crt --key=./cluster.key -n kong-cp

kubectl create secret generic kong-enterprise-license -n kong-cp --from-file=./license


helm install kong-cp kong/kong -n kong-cp --values ./cp_values.yaml
```


### Check CP's log
```
kubectl logs -f $(kubectl get pod -n kong-cp -o json | jq -r '.items[].metadata | select(.ownerReferences[0].kind == "ReplicaSet")' | jq -r '.name') -n kong-cp
```

### Consumer CP
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

### EKS Node
```
eksctl create nodegroup -f - <<EOF
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: kong310-eks132
  region: us-east-2

nodeGroups:
  - name: node-ai-gateway
    instanceType: c5.4xlarge
    amiFamily: AmazonLinux2023
    #availabilityZones: ["us-east-2a"]
    minSize: 1
    maxSize: 8
    ssh:
      publicKeyName: acquaviva-us-east-2
    kubeletExtraConfig:
      allowedUnsafeSysctls:
        - "net.ipv4.tcp_max_tw_buckets"
        - "net.ipv4.ip_local_port_range"
EOF
```

### Install Data Plane

Instance mode
Instance target mode supports pods running on AWS EC2 instances. In this mode, AWS NLB sends traffic to the instances and the kube-proxy on the individual worker nodes forward it to the pods through one or more worker nodes in the Kubernetes cluster.

IP mode
IP target mode supports pods running on AWS EC2 instances and AWS Fargate. In this mode, the AWS NLB targets traffic directly to the Kubernetes pods behind the service, eliminating the need for an extra network hop through the worker nodes in the Kubernetes cluster.





//kubectl create sa kaigateway-podid-sa -n kong-dp


```
helm uninstall kong -n kong-dp
kubectl delete namespace kong-dp

kubectl create namespace kong-dp

kubectl create secret tls kong-cluster-cert --cert=./cluster.crt --key=./cluster.key -n kong-dp

kubectl create secret generic kong-enterprise-license -n kong-dp --from-file=./license


helm uninstall kong -n kong-dp
helm install kong kong/kong -n kong-dp --values ./dp_values.yaml
helm upgrade kong kong/kong -n kong-dp --values ./dp_values.yaml
```


#### Check DP's logs

```
kubectl logs -f $(kubectl get pod -n kong-dp -o json | jq -r '.items[].metadata.name') -n kong-dp

kubectl logs -f $(kubectl get pod -n kong-dp -o json | jq -r '.items[].metadata | select(.name | startswith("kong-"))' | jq -r '.name') -n kong-dp


kubectl exec -ti $(kubectl get pod -n kong-dp -o json | jq -r '.items[].metadata | select(.name | startswith("kong-"))' | jq -r '.name') -c proxy -n kong-dp -- /bin/bash
```




#### Checking the Data Plane from the Control Plane
http $CONTROLPLANE_LB:8001/clustering/status


#### Checking the Proxy
Use the Load Balancer created during the deployment

```
export DATAPLANE_LB=$(kubectl get service -n kong-dp kong-kong-proxy --output=jsonpath='{.status.loadBalancer.ingress[0].hostname}')

http $DATAPLANE_LB
```