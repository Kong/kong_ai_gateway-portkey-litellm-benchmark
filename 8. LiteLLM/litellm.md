# LiteLLM


## EKS Storage Class
LiteLLM requires a Postgres database for its metadata. The following [litellm-storageclass.yaml](../litellm/litellm-storageclass.yaml) declaration creates a new StorageClass for it

```
kubectl apply -f ./litellm-storageclass.yaml
```

## LiteLLM installation

To install it, we are going to use the [Helm Charts](https://docs.litellm.ai/docs/proxy/deploy#helm-chart) provides by LiteLLM

```
helm pull oci://ghcr.io/berriai/litellm-helm
tar -zxvf litellm-helm-0.1.636.tgz
```

For the install use the following [values.yaml](../litellm/values.yaml) declaration. The d

https://docs.litellm.ai/docs/providers/custom
https://docs.litellm.ai/docs/proxy/cli#--num_workers

```
helm install litellm ./litellm-helm -n litellm --create-namespace -f ./values.yaml
```


To expose the deployment creates another NLB for it using the [litellm-service](../litellm/litellm-service.yaml) declaration:


```
kubectl apply -f litellm-service.yaml
```

## Checking the logs

```
kubectl logs -f $(kubectl get pod -n litellm -o json | jq -r '.items[].metadata | select(.ownerReferences[0].kind == "ReplicaSet")' | jq -r '.name') -n litellm
```


## Check the installation

Inside the K6's EC2 instance run:

```
export LITELLM_LB=$(kubectl get service litellm-lb -n litellm --output=jsonpath='{.status.loadBalancer.ingress[0].hostname}')
```

```
http $LITELLM_LB:4000
```


## Send requests to LiteLLM

Now send a request so LiteLLM can route it to WireMock. Make sure you have set the ``PROMPT`` environment variable:


```
curl -sX POST \
  --url http://$LITELLM_LB:4000/chat/completions \
  --header 'Content-Type: application/json' \
  --data '{
        "model": "wiremock",
        "messages": [
          {
            "role": "user",
            "content": "'"$PROMPT"'"
          }
        ]
    }' | jq '.choices[].message.content'
```



### Delete the LiteLLM deployment

```
helm uninstall litellm -n litellm
kubectl delete pvc data-litellm-postgresql-0 -n litellm
```

