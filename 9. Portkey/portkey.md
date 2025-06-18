# Portkey

https://hub.docker.com/r/portkeyai/gateway
https://portkey.ai/docs/product/open-source
https://portkey.ai/docs/changelog/open-source
https://github.com/portkey-ai/gateway
https://openrouter.ai/
https://github.com/Portkey-AI/portkey-python-sdk
https://portkey.ai/blog
https://github.com/Portkey-AI/gateway/blob/main/docs/installation-deployments.md
https://portkey.ai/docs/api-reference/admin-api/control-plane/api-keys/create-api-key
https://www.uvicorn.org/
https://github.com/Portkey-AI/helm-chart
https://portkey.ai/docs/api-reference/sdk/python


## Installation

Create a Namespace and apply the [portkey_deployment.yaml](../portkey/portkey_deployment.yaml) declaration. This time we are spinnning up 12 replicas of the AI Gateway allocating 1 CPU per replica. As usual, using ``nodeSelector`` to make sure the deployment goes to the ``node-ai-gateway`` EKS Node.


```
kubectl create namespace portkey
```

```
kubectl apply -f portkey_deployment.yaml
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




















⚙️ Portkey Performance Summary

Feature		Config Snippet					Benefit
Connection Pooling	httpx.Client(...)					Faster HTTP performance
Async Batching	asyncio.gather()					High throughput
Retry Logic		retry={"max_retries": 3}				Resilience
Caching		Wrap Portkey call with Redis/memory cache	Reduce duplicate work
Lightweight Models	Use gpt-3.5-turbo					Speed/cost efficiency
Server Tuning		--workers 4, async FastAPI				Handle more requests


Optimization 		Area Action
Async handling 	Use asyncio or non-blocking HTTP clients
Streaming		Enable stream=true for faster perceived output
API key pool		Balance load across multiple provider keys
Smart routing		Use provider fallbacks with latency-based priority
Connection pooling	Use persistent HTTP clients
Monitoring		Enable logging to track bottlenecks





kubectl delete -f portkey_deployment.yaml
kubectl delete namespace portkey
