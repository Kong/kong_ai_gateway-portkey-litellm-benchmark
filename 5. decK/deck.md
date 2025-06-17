# decK

Make sure you hat the ``CONTROL_PLANE_LB`` environment variable set:

Ping it first
```
deck gateway ping --kong-addr http://$CONTROLPLANE_LB:8001
```

Submit the [kong.yaml](../deck/kong.yaml) declaration. Change the declaration using your WireMock's NLB DNS name.
```
deck gateway sync --kong-addr http://$CONTROLPLANE_LB:8001 ./kong.yaml
```


## Send requests to Data Plane

Make sure you have the ``DATAPLANE_LB`` and ``PROMPT`` environment variables set:

```
curl -i --request POST \
  --url http://$DATAPLANE_LB/llm_route \
  --header 'Content-Type: application/json' \
  --data '{
     "messages": [
       {
         "role": "user",
         "content": "'"$PROMPT"'"
       }
     ]
}'
```
