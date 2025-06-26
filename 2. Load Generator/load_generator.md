# K6 - Load Generator Installation

## EC2 Instance

K6 will be installed on an EC2 running Ubuntu 24.04. The EC2 will run on same VPC created by the EKS Cluster on a specific EC2 instance.

Get the AMI Id first. Canonical has a well known owner id as ``099720109477``. The query gets the most recent AMI available.
```
AMI_ID=$(aws ec2 describe-images \
  --region us-east-2 \
  --owners 099720109477 \
  --query "Images | sort_by(@, &CreationDate) | [-1].{ID:ImageId}" \
  --filters "Name=description,Values='Canonical, Ubuntu, 24.04, amd64*'" \
  --output text)
```

  


Two main settings here are:
* ``security-group-ids``: it should be the security id set with ``all-traffic - SSH``.
* ``subnet-id``: it is a public subnet where EKS node were created.

```
aws ec2 run-instances \
  --region us-east-2 \
  --image-id $AMI_ID \
  --count 1 \
  --instance-type c6i.4xlarge \
  --key-name acquaviva-us-east-2 \
  --security-group-ids <YOUR_SECURITY_GROUP_ID> \
  --subnet-id <YOUR_SUBNET_ID> \
  --associate-public-ip-address \
  --tag-specification 'ResourceType=instance,Tags=[{Key="Name",Value="load-generator"}]' \
  --block-device-mapping '[{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize": 500}}]'
```

## Login to the EC2

Use the same AWS Key pair you've created previously

```
EC2_ID=$(aws ec2 describe-instances --region us-east-2 --filters "Name=tag:Name,Values=load-generator" "Name=instance-state-name,Values=running" --query "Reservations[0].Instances[0].{ID:InstanceId}" --output text)

EC2_DNS_NAME=$(aws ec2 describe-instances --region us-east-2 --instance-id $EC2_ID | jq -r ".Reservations[0].Instances[0].PublicDnsName")

ssh -i "acquaviva-us-east-2.pem" ubuntu@$EC2_DNS_NAME
```


## Install utilities
```
sudo su

apt-get update
```

```
apt-get -y install httpie jq
```

### kubectl
```
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"

install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
```

### AWS CLI
Configure the AWS CLI with your Access and Secret Keys

```
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"

unzip awscliv2.zip
./aws/install
```
```
aws configure
```

Update your kubeconfig file with your EKS Cluster reference

```
aws eks update-kubeconfig --name kong310-eks132 --region us-east-2
```

### decK

Install [decK](https://docs.konghq.com/deck/) (declaration for Kong)

```
wget https://github.com/Kong/deck/releases/download/v1.47.1/deck_1.47.1_linux_amd64.tar.gz

tar xvf deck_1.47.1_linux_amd64.tar.gz
mv ./deck /usr/local/bin
```


## K6


```
gpg -k

gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69

echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
```

```
apt-get update
```

```
apt-get install k6
```

```
cp /usr/bin/k6 /usr/local/bin
```

Check K6 version

```
# k6 version
k6 v1.0.0 (commit/41b4984b75, go1.24.2, linux/amd64)
```