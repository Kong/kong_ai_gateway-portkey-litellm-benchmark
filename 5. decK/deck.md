# decK

Make sure you hat the ``CONTROL_PLANE_LB`` environment variable set:

Ping it first
```
deck gateway ping --kong-addr http://$CONTROLPLANE_LB:8001
```

Submit the [kong.yaml](../deck/kong.yaml) declaration
```
deck gateway sync --kong-addr http://$CONTROLPLANE_LB:8001 ./kong.yaml
```


## Send requests to Data Plane

Make sure you have the ``PROMPT`` environment variable set:

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
