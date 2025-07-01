# WireMock

We are going to mock an OpenAI based LLM infrastructure with WireMock.


## Create a Node for WireMock

WireMock runs on a specific Node so it doesn't compete for resources with the AI Gateways.

```
eksctl create nodegroup --cluster kong310-eks132 \
  --region $AWS_DEFAULT_REGION \
  --name node-llm \
  --node-labels="nodename=node-llm" \
  --node-type c5.4xlarge \
  --nodes 1 \
  --nodes-min 1 --nodes-max 128 \
  --max-pods-per-node 50 \
  --ssh-access --ssh-public-key aig-benchmark
```


## Install WireMock

```
helm repo add wiremock https://wiremock.github.io/helm-charts
helm repo update
```

Note we use the nodeSelector option to drive the deployment to the specific EKS Node.

```
helm install wiremock wiremock/wiremock -n wiremock \
  --create-namespace \
  --set service.type=ClusterIP \
  --set resources.requests.cpu=4 \
  --set resources.requests.memory=8Gi \
  --set resources.limits.cpu=16 \
  --set resources.limits.memory=32Gi \
  --set nodeSelector."alpha\.eksctl\.io/nodegroup-name"=node-llm
```

You can check WireMock's logs with:
```
kubectl logs -f $(kubectl get pod -n wiremock -o json | jq -r '.items[].metadata | select(.name | startswith("wiremock-"))' | jq -r '.name') -n wiremock
```

Create an Internal NLB for WireMock
```
kubectl apply -f wiremock-service.yaml
```

## Test WireMock

You can test WireMock installation port-forwarding its port or hitting it directly from the K6's EC2.

### Port-Forward
```
kubectl port-forward service/wiremock -n wiremock 9021
```

In another terminal run
```
export WIREMOCK_LB=$(kubectl get service wiremock-lb -n wiremock --output=jsonpath='{.status.loadBalancer.ingress[0].hostname}')

http $WIREMOCK_LB:9021
http $WIREMOCK_LB:9021/__admin/mappings
```

### K6's EC2
```
export WIREMOCK_LB=$(kubectl get service -n wiremock wiremock-lb --output=jsonpath='{.status.loadBalancer.ingress[0].hostname}')
```

```
http $WIREMOCK_LB:9021
http $WIREMOCK_LB:9021/__admin/mappings
```


## Configure WireMock

Now use the [``json``](../wiremock/openai.com-stubs.json) file the configure WireMock with OpenAI based endpoints:

```
curl -v -d@openai.com-stubs.json http://$WIREMOCK_LB:9021/__admin/mappings/import

http $WIREMOCK_LB:9021/__admin/mappings | jq '.mappings[].request'
```


## Send requests to WireMock

We have [4 prompts](./prompts.md) available. For these benchmarks test use [Prompt #3](./prompts.md#prompt-3-used-for-the-tests).

Inside K6's EC2 run:
```
curl -s --request POST \
  --url http://$WIREMOCK_LB:9021/chat \
  --header 'Content-Type: application/json' \
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
