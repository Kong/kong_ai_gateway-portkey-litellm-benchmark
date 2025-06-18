# Kong Konnect

## Kong Gateway Operator (KGO), Konnect Control Plane creation and Data Plane deployment

We are going to use [Kong Gateway Operator (KGO)](https://docs.konghq.com/gateway-operator) to create the Konnect Control Plane and Data Plane. First, install the KGO Operator:

```
helm repo add kong https://charts.konghq.com
helm repo update kong
```

```
helm upgrade --install kgo kong/gateway-operator \
  -n kong-system \
  --create-namespace \
  --set image.tag=1.6 \
  --set kubernetes-configuration-crds.enabled=true \
  --set env.ENABLE_CONTROLLER_KONNECT=true
```

You can check the Operator's logs with:

```
kubectl logs -f $(kubectl get pod -n kong-system -o json | jq -r '.items[].metadata | select(.name | startswith("kgo-gateway"))' | jq -r '.name') -n kong-system
```

And if you want to uninstall it run:
```
helm uninstall kgo -n kong-system
kubectl delete namespace kong-system
```

## Konnect registration
You will need a Konnect subscription. Click on the [Registration](https://konghq.com/products/kong-konnect/register) link, present your credentials and get a 30-day Konnect Plus trial.


## Konnect PAT (Personal Access Token)
KGO requires a [Konnect Personal Access Token (PAT)](https://docs.konghq.com/konnect/org-management/access-tokens/) for creating the Control Plane. You need to register first. To generate your PAT, click on your initials in the upper right corner of the Konnect home page, then select Personal Access Tokens. Click on ``+ Generate Token``, name your PAT, set its expiration time, and be sure to copy and save it, as Konnect won’t display it again.


## Konnect Control Plane creation

Create a Namespace and a Secret 

```
kubectl create namespace kong

kubectl create secret generic konnect-pat -n kong --from-literal=token='<YOUR_PAT>'

kubectl label secret konnect-pat -n kong "konghq.com/credential=konnect"
```


## Kong Konnect Control Plane

The Control Plane installation uses the following [cp.yaml](../kgo/cp.yaml) file.

```
kubectl apply -f ./cp_yaml
```


## Kong Konnect Data Plane

The Data Plane uses the [dp.yaml](../kgo/dp.yaml) file:

```
kubectl apply -f ./dp_yaml
```

### Check DP's logs

You can check the Data Plane logs with

```
kubectl logs -f $(kubectl get pod -n kong -o json | jq -r '.items[].metadata | select(.name | startswith("dataplane-"))' | jq -r '.name') -n kong
```









kubectl delete dataplane dataplane1 -n kong
kubectl delete konnectextensions.konnect.konghq.com konnect-config1 -n kong
