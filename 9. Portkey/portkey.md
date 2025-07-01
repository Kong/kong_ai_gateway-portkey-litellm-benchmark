# Portkey

## Installation

Create a Namespace and apply the [portkey_deployment.yaml](../portkey/portkey_deployment.yaml) declaration. This time we are spinnning up 12 replicas of the AI Gateway allocating 1 CPU per replica. As usual, using ``nodeSelector`` to make sure the deployment goes to the ``node-ai-gateway`` EKS Node.


```
kubectl create namespace portkey
```

```
kubectl apply -f portkey_deployment.yaml
kubectl apply -f portkey_service.yaml
```


## Check the Logs

```
kubectl logs -f $(kubectl get pod -n portkey -o json | jq -r '.items[].metadata.name') -n portkey
```

## Check the installation

Inside the K6's EC2 instance run:

```
export PORTKEY_LB=$(kubectl get service -n portkey -o json | jq -r '.items[].status.loadBalancer.ingress[].hostname')
```




## Send requests to Portkey

Now send a request to Portkey using the ``x-portkey-custom-host`` header, so the Portkey can route it to WireMock. Make sure you have set the ``WIREMOCK_LB`` and ``PROMPT`` environment variables.

If you will, you can set the ``WIREMOCK_LB`` env variable with:

```
export WIREMOCK_LB=$(kubectl get service wiremock-lb -n wiremock --output=jsonpath='{.status.loadBalancer.ingress[0].hostname}')
```

Send a request

```
curl -s --request POST http://$PORTKEY_LB:8787/v1/chat \
  -H "Content-Type: application/json" \
  -H "x-portkey-provider: openai" \
  -H "x-portkey-custom-host: http://$WIREMOCK_LB:9021" \
  --data '{
        "messages": [
        {
        "role": "user",
      "content": "'"$PROMPT"'"
    }
  ]
}                                   
' | jq '.choices[].message.content'
```

## K6

Inside the K6's EC2 use the [Portkey's K6 script](../k6/portkey.js) to run the performance test. Make sure you have the ``PORTKEY_LB``, ``WIREMOCK_LB`` and ``PROMPT`` environment variables set.

```
k6 run portkey.js
```




## Delete the Portkey deployment

```
kubectl delete -f portkey_deployment.yaml
```
