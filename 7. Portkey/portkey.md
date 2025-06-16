Portkey

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


kubectl delete -f portkey_deployment.yaml
kubectl delete namespace portkey


kubectl delete secret ghcr-secret -n portkey

kubectl create secret docker-registry ghcr-secret -n portkey \
  --docker-server=ghcr.io \
  --docker-username=cacquaviva \
  --docker-email=claudio.acquaviva@gmail





kubectl create namespace portkey
kubectl apply -f portkey_deployment.yaml



kubectl logs -f $(kubectl get pod -n portkey -o json | jq -r '.items[].metadata.name') -n portkey



export PORTKEY_LB=$(kubectl get service -n portkey -o json | jq -r '.items[].status.loadBalancer.ingress[].hostname')




curl -s http://$PORTKEY_LB:8787/v1/chat/completions \
  -H 'x-portkey-provider: openai' \
  -H "Authorization: Bearer $OPENAI_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"messages": [{"role": "user","content": "Tell me more about Graciliano Ramos"}], "max_tokens": 20, "model": "gpt-4"}' | jq


curl -s http://$PORTKEY_LB:8787/v1/chat/completions \
  -H 'x-portkey-provider: openai' \
  -H "Authorization: Bearer $OPENAI_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"messages": [{"role": "user","content": "Tell me more about Graciliano Ramos"}], "model": "gpt-4"}' | jq








export WIREMOCK_LB=$(kubectl get service wiremock-lb -n wiremock --output=jsonpath='{.status.loadBalancer.ingress[0].hostname}')



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


