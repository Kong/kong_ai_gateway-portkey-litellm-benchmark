# Load Generator

## EC2 Instance

```
aws ec2 run-instances \
  --region us-east-2 \
  --image-id ami-0cb91c7de36eed2cb \
  --count 1 \
  --instance-type c6i.4xlarge \
  --key-name acquaviva-us-east-2 \
  --security-group-ids sg-036cac211b4b31dc0 \
  --subnet-id subnet-066e88c223eb0c658 \
  --associate-public-ip-address \
  --tag-specification 'ResourceType=instance,Tags=[{Key="Name",Value="load-generator"}]' \
  --block-device-mapping '[{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize": 500}}]'
```




  --security-group-ids sg-044277768d92b71d5 # all-traffic - SSH \
  --subnet-id subnet-0bc95eab7c5fa4691 # public subnet where EKS node is \






```
EC2_ID=$(aws ec2 describe-instances --region us-east-2 --filters "Name=tag:Name,Values=load-generator" "Name=instance-state-name,Values=running" --query "Reservations[0].Instances[0].{ID:InstanceId}" --output text)

EC2_DNS_NAME=$(aws ec2 describe-instances --region us-east-2 --instance-id $EC2_ID | jq -r ".Reservations[0].Instances[0].PublicDnsName")

ssh -i "acquaviva-us-east-2.pem" ubuntu@$EC2_DNS_NAME
```


### Install utilities
```
sudo su

apt-get update
apt-get -y install httpie jq
```

#### kubectl
```
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"

install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
```

#### AWS CLI
```
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"

unzip awscliv2.zip
./aws/install

aws configure

aws eks update-kubeconfig --name kong310-eks132 --region us-east-2
```

#### decK
```
wget https://github.com/Kong/deck/releases/download/v1.47.1/deck_1.47.1_linux_amd64.tar.gz

tar xvf deck_1.47.1_linux_amd64.tar.gz
mv ./deck /usr/local/bin
```




export CONTROLPLANE_LB=$(kubectl get svc -n kong-cp kong-cp-kong-admin --output=jsonpath='{.status.loadBalancer.ingress[0].hostname}')

http $CONTROLPLANE_LB:8001 | jq -r '.version'


deck gateway ping --kong-addr http://$CONTROLPLANE_LB:8001
deck gateway sync --kong-addr http://$CONTROLPLANE_LB:8001 ./kong.yaml



export DATAPLANE_LB=$(kubectl get service kong-kong-proxy -n kong-dp --output=jsonpath='{.status.loadBalancer.ingress[0].hostname}')


kubectl get service -n kong-dp kong-kong-proxy --output=jsonpath='{.status.loadBalancer.ingress[0].hostname}'
a4c687dccbe484757bbc8a38870b0194-1042085709.us-east-2.elb.amazonaws.com


http $DATAPLANE_LB
http $DATAPLANE_LB/upstream_route/json/valid

