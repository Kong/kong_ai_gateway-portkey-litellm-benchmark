This is a performance benchmark comparing Kong AI Gateway with Portkey and LiteLLM.

The benchmark tests were executed in AWS. The server infrastructure ran on an Amazon Elastic Kubernetes Service (EKS) cluster, 1.32. In order to have  better control over the AI Gateways and remove the native LLM infrastructure variables, such as latency time and throughput, we mocked an LLM with WireMock to expose OpenAI-based endpoints. WireMock is an open-source tool used to simulate API responses.

The AI Gateways were exposed to the consumers through a Network Load Balancer (NLB) to protect them from external interference. Similarly, the mocking LLM was exposed with an NLB. In order to not compete for the same hardware (HW) resources, the AI Gateways and WireMock ran in their own EKS Nodes based on the c5.4xlarge instance type with 16 vCPUs and 32GiB of memory.

Lastly, K6 played the load generator role, running on an EC2 instance deployed in the same VPC as the EKS Cluster. For all benchmark tests, K6 ran for 3 minutes always injecting the same throughput to all AI Gateway with 400 VUs (each VU representing a consumer) sending requests with 1000 prompt tokens.




![kong](/static/images/architecture.png)


To have your own deployment and run the same tests read the instructs described in the following order:

1. [AWS and EKS]("/1. AWS-EKS/readme.md")
