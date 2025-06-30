# Benchmark tests with Kong AI Gateway with Portkey and LiteLLM

The benchmark tests were executed in AWS. The server infrastructure ran on an Amazon Elastic Kubernetes Service (EKS) cluster, 1.32. In order to have  better control over the AI Gateways and remove the native LLM infrastructure variables, such as latency time and throughput, we mocked an LLM with WireMock to expose OpenAI-based endpoints. WireMock is an open-source tool used to simulate API responses.

The AI Gateways were exposed to the consumers through a Network Load Balancer (NLB) to protect them from external interference. Similarly, the mocking LLM was exposed with an NLB. In order to not compete for the same hardware (HW) resources, the AI Gateways and WireMock ran in their own EKS Nodes based on the c5.4xlarge instance type with 16 vCPUs and 32GiB of memory.

All AI Gateway deployments had the resource configuration with an upper limit of 12 CPUs. They were deployed with the default configuration, meaning they were not tuned to get better results.



K6 played the load generator role, running on an EC2 instance deployed in the same VPC as the EKS Cluster. For all benchmark tests, K6 ran for 3 minutes always injecting the same throughput to all AI Gateways with 400 VUs (each VU representing a consumer) sending requests with 1000 prompt tokens.

Lastly, another EKS Node was used to deploy tools and admin components like Prometheus/Grafana, the AWS Load Balancer Controller and Kong Gateway Enterprise Control Plane.





<img src="/static/images/architecture.png" width="757" height="477"/>


To have your own deployment and run the same tests read the instructs described in the following order:

1. [AWS and EKS](./1.%20AWS-EKS/aws-eks.md)
2. [Load Generator Installation](./2.%20Load%20Generator/load_generator.md)
3. [Kong Gateway Enterprise](./3.%20Kong%20Gateway%20Enterprise/kong_gateway_enterprise.md)
4. [WireMock](./4.%20WireMock/wiremock.md)
5. [decK](./5.%20decK/deck.md)
6. [K6](./6.%20K6/k6.md)
7. [Konnect](./7.%20Konnect/kong_gateway_enterprise.md)
8. [LiteLLM](./8.%20LiteLLM/litellm.md)
9. [Portkey](./9.%20Portkey/portkey.md)