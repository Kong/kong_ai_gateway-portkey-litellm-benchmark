LiteLLM

https://docs.litellm.ai/docs/proxy/deploy#kubernetes
https://docs.litellm.ai/docs/proxy/deploy#helm-chart
https://github.com/BerriAI/litellm/pkgs/container/litellm-helm
https://www.digitalocean.com/community/tutorials/how-to-deploy-postgres-to-kubernetes-cluster
https://docs.litellm.ai/docs/providers/custom
https://docs.litellm.ai/docs/proxy/cli#--num_workers
https://docs.litellm.ai/docs/proxy/prod
https://docs.litellm.ai/docs/benchmarks
https://docs.litellm.ai/docs/load_test_advanced
https://docs.litellm.ai/docs/proxy/prod
https://litellm-api.up.railway.app/



cat <<EOF > litellm-storageclass.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: litellm-sc
provisioner: ebs.csi.aws.com
volumeBindingMode: Immediate
parameters:
  fsType: ext4
  type: gp3
reclaimPolicy: Delete
allowVolumeExpansion: true
allowedTopologies:
- matchLabelExpressions:
  - key: topology.kubernetes.io/zone
    values:
    - us-east-2a
EOF

kubectl apply -f litellm-storageclass.yaml





helm pull oci://ghcr.io/berriai/litellm-helm
tar -zxvf litellm-helm-0.1.636.tgz





helm uninstall litellm -n litellm
kubectl delete pvc data-litellm-postgresql-0 -n litellm
kubectl delete namespace litellm


helm install litellm ./litellm-helm -n litellm --create-namespace -f ./values.yaml




cat <<EOF > litellm-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: litellm-lb
  namespace: litellm
  annotations:
    "service.beta.kubernetes.io/aws-load-balancer-type": "nlb"
    "service.beta.kubernetes.io/aws-load-balancer-nlb-target-type": "ip"
    service.beta.kubernetes.io/aws-load-balancer-target-group-attributes: proxy_protocol_v2.enabled=true
    service.beta.kubernetes.io/aws-load-balancer-subnets: subnet-0971dc10338e97fa1

spec:
  type: LoadBalancer
  selector:
    app.kubernetes.io/name: litellm
  ports:
    - protocol: TCP
      port: 4000
      targetPort: 4000
      name: litellm
EOF

kubectl apply -f litellm-service.yaml

kubectl logs -f $(kubectl get pod -n litellm -o json | jq -r '.items[].metadata | select(.ownerReferences[0].kind == "ReplicaSet")' | jq -r '.name') -n litellm



Send requests to LiteLLM

export LITELLM_LB=$(kubectl get service litellm-lb -n litellm --output=jsonpath='{.status.loadBalancer.ingress[0].hostname}')

http $LITELLM_LB:4000




curl -s --request POST \
  --url http://$DATAPLANE_LB/llm_route \
  --header 'Content-Type: application/json' \
  --data '{
        "messages": [
          {
            "role": "user",
            "content": "'"$PROMPT"'"
          }
       ]
    }' | jq '.choices[].message.content'



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

