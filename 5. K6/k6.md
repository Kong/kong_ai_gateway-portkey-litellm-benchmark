WireMock


Node

helm uninstall ollama -n ollama
kubectl delete namespace ollama

eksctl delete nodegroup --cluster kong310-eks132 --name node-llm --drain=false --region us-east-2

   --node-type g6.xlarge \
   --node-type g6.12xlarge \
   --node-type g6e.xlarge \
   --node-type p4d.24xlarge \
   --node-type c5.xlarge \

  --node-zones=us-east-2a \


eksctl create nodegroup --cluster kong310-eks132 \
  --region us-east-2 \
  --name node-llm \
  --node-labels="nodename=node-llm" \
  --node-type c5.4xlarge \
  --nodes 1 \
  --nodes-min 1 --nodes-max 128 \
  --max-pods-per-node 50 \
  --ssh-access --ssh-public-key acquaviva-us-east-2




aws ec2 describe-instances --region us-east-2 --filters "Name=tag:Name,Values=kong310-eks132-node-llm-Node" --query "Reservations[].Instances[].PublicDnsName"
[
    "ec2-13-58-186-242.us-east-2.compute.amazonaws.com"
]








ssh -i "acquaviva-us-east-2.pem" ec2-user@ec2-13-58-186-242.us-east-2.compute.amazonaws.com


sudo iptables-save | grep ollama


Install WireMock

https://wiremock.org/docs/standalone/admin-api-reference/
https://docs.wiremock.io/overview
https://docs.wiremock.io/openAPI/openapi
https://wiremock.org/docs/
https://github.com/wiremock/helm-charts
https://github.com/wiremock/api-template-library




helm repo add wiremock https://wiremock.github.io/helm-charts
helm repo update

helm uninstall wiremock -n wiremock
kubectl delete namespace wiremock

helm install wiremock wiremock/wiremock -n wiremock \
  --create-namespace \
  --set service.type=ClusterIP \
  --set resources.requests.cpu=4 \
  --set resources.requests.memory=8Gi \
  --set resources.limits.cpu=16 \
  --set resources.limits.memory=32Gi \
  --set nodeSelector."alpha\.eksctl\.io/nodegroup-name"=node-llm

kubectl logs -f $(kubectl get pod -n wiremock -o json | jq -r '.items[].metadata | select(.name | startswith("wiremock-"))' | jq -r '.name') -n wiremock


cat <<EOF > wiremock-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: wiremock-lb
  namespace: wiremock
  annotations:
    "service.beta.kubernetes.io/aws-load-balancer-type": "nlb"
    "service.beta.kubernetes.io/aws-load-balancer-nlb-target-type": "ip"
    service.beta.kubernetes.io/aws-load-balancer-target-group-attributes: proxy_protocol_v2.enabled=true

spec:
  type: LoadBalancer
  selector:
    app.kubernetes.io/name: wiremock
  ports:
    - protocol: TCP
      port: 9021
      targetPort: 9021
      name: wiremock
EOF

kubectl delete -f wiremock-service.yaml
kubectl apply -f wiremock-service.yaml


export WIREMOCK_LB=$(kubectl get service -n wiremock wiremock-lb --output=jsonpath='{.status.loadBalancer.ingress[0].hostname}')


kubectl port-forward service/wiremock -n wiremock 9021
http $WIREMOCK_LB:9021
http $WIREMOCK_LB:9021/__admin/mappings

http $WIREMOCK_LB:9021/__admin/mappings | jq '.mappings[].request'
"/v1/hello"
"/v1/hello"
"/v1/hello"


curl -v -d@openai.com-stubs.json http://$WIREMOCK_LB:9021/__admin/mappings/import

http $WIREMOCK_LB:9021/__admin/mappings | jq '.mappings[].request'







Prompts

Prompt 1

export PROMPT="Hi"


Prompt 2

export PROMPT="Write a detailed product description for a new electric toothbrush that emphasizes its advanced sonic technology, long battery life, and customizable cleaning modes, targeting environmentally conscious consumers, including key features like a replaceable brush head, pressure sensor, and a sleek design, while also highlighting its sustainability benefits."


–Prompt 3

export PROMPT="I want you to write a highly detailed, immersive, and engaging fantasy short story set in a richly developed, medieval-inspired world filled with magic, mythical creatures, and complex characters. The story should follow a reluctant hero who is thrust into an epic quest to retrieve an ancient artifact of immense power—one that could alter the fate of kingdoms, civilizations, or even reality itself. \
The narrative should be visually stunning and intellectually engaging, providing rich world-building, deep internal conflicts, and external challenges. The storytelling should evoke mystery, wonder, and tension, ensuring a compelling journey filled with unexpected twists and revelations. \
World-Building: A Living, Breathing Fantasy Realm \
1.Kingdoms and Empires \
.Describe the realm''s political state: Thriving, in decline, at war, or under a fragile peace? \
.Define major cities, fortresses, and settlements, including their architecture, culture, and rulers. \
.Introduce noble houses, warring factions, religious sects, and underground guilds. \
2.Geographical Wonders \
. Enchanted forests with whispering spirits and lost civilizations. \
. Sprawling deserts where ancient nomads guard forgotten relics. \
. Towering mountain ranges home to seers, exiled warriors, or celestial beings. \
. Frozen wastelands that conceal ruins of an extinct race. \
. Sunken cities beneath an abyssal sea where forbidden knowledge lies. \
3.Mythical Creatures and Beings \
. Are there dragons, fae, spirits, or monstrous titans? \
. Are magical beings feared, revered, or hunted? \
. Are there ancient gods, forgotten deities, or celestial guardians? \
4.Magic System: Rules, Limitations, and Dangers \
. Is magic elemental, divine, arcane, or forbidden? \
. How is it accessed—through incantations, artifacts, celestial forces, or blood rituals? \
. Is magic a blessing, a curse, or a dwindling art? \
. Who wields it—only the noble-born, secretive cults, or outcasts? \
5.Ancient Legends and Prophecies \
. Are there forgotten myths or long-lost prophecies shaping this world? \
. Does the protagonist unknowingly fulfill an ancient destiny or defy fate? \
The Protagonist: A Reluctant Hero with Depth \
1.Character Archetype \
. A scholar forced to interpret an ancient prophecy. \
. A thief who unknowingly steals a world-changing relic. \
. A cursed noble trying to break a dark legacy. \
. A simple villager marked by an unknowable force. \
2.Personal Struggles and Internal Conflicts \
. Are they running from a past mistake, a tragic loss, or a dark secret? \
. What is their greatest fear? How does it shape their actions? \
. Are they forced into heroism, or do they fight against their fate? \
3.Strengths and Weaknesses \
. Are they brilliant but physically weak? \
. Are they powerful but morally conflicted? \
. Are they gifted but cursed with an uncontrollable force? \
4.Motivations and Goals \
. Do they seek revenge, redemption, freedom, or knowledge? \
. Are they a pawn of destiny or a rogue agent fighting fate? \
Supporting Cast: Allies, Rivals, and Villains \
1.The Mentor or Enigmatic Guide \
. A fallen knight hiding from past sins. \
. A cursed mage who sees the hero as their last hope. \
. A mysterious prophet who speaks in riddles. \
2.The Rival or Competitor \
. An ambitious rogue with conflicting ideals. \
. An embittered sibling seeking vengeance. \
. A corrupted former friend who sees the hero as a danger. \
3.The Loyal Companion \
. A childhood friend, reluctant but loyal. \
. A mystical creature with a cryptic purpose. \
. An outlawed warrior seeking redemption. \
4.The Villain: A Nuanced Adversary \
. Are they truly evil, or do they believe they are the hero? \
. Do they see the protagonist as a danger to the world? \
. Were they once a hero themselves? \
The Quest: Challenges, Betrayals, and Revelations \
1.The Artifact: A Relic of Power and Mystery \
. What is its true history? Was it forged by gods, stolen from demons, or sealed away for eternity? \
2. Trials and Dangers Along the Journey \
3. Unexpected Twists \
Writing Style and Atmosphere \
1. Epic, Immersive, and Emotionally Gripping \
2. Balance of Action, Dialogue, and Introspection \
. Ensure a mix of thrilling battles, heartfelt conversations, and deep character introspection. \
3. Impactful Conclusion \
. The ending should feel earned, whether triumphant, tragic, bittersweet, or open-ended."

Prompt 4

export PROMPT="I want you to write a highly detailed, immersive, and engaging fantasy short story set in a richly developed, medieval-inspired world filled with magic, mythical creatures, and complex characters. The story should follow a reluctant hero who is thrust into an epic quest to retrieve an ancient artifact of immense power—one that could alter the fate of kingdoms, civilizations, or even reality itself. \
The narrative should be visually stunning and intellectually engaging, providing rich world-building, deep internal conflicts, and external challenges. The storytelling should evoke mystery, wonder, and tension, ensuring a compelling journey filled with unexpected twists and revelations. \
World-Building: A Living, Breathing Fantasy Realm \
1.Kingdoms and Empires \
.Describe the realm''s political state: Thriving, in decline, at war, or under a fragile peace? \
.Define major cities, fortresses, and settlements, including their architecture, culture, and rulers. \
.Introduce noble houses, warring factions, religious sects, and underground guilds. \
2.Geographical Wonders \
. Enchanted forests with whispering spirits and lost civilizations. \
. Sprawling deserts where ancient nomads guard forgotten relics. \
. Towering mountain ranges home to seers, exiled warriors, or celestial beings. \
. Frozen wastelands that conceal ruins of an extinct race. \
. Sunken cities beneath an abyssal sea where forbidden knowledge lies. \
3.Mythical Creatures and Beings \
. Are there dragons, fae, spirits, or monstrous titans? \
. Are magical beings feared, revered, or hunted? \
. Are there ancient gods, forgotten deities, or celestial guardians? \
4.Magic System: Rules, Limitations, and Dangers \
. Is magic elemental, divine, arcane, or forbidden? \
. How is it accessed—through incantations, artifacts, celestial forces, or blood rituals? \
. Is magic a blessing, a curse, or a dwindling art? \
. Who wields it—only the noble-born, secretive cults, or outcasts? \
5.Ancient Legends and Prophecies \
. Are there forgotten myths or long-lost prophecies shaping this world? \
. Does the protagonist unknowingly fulfill an ancient destiny or defy fate? \
The Protagonist: A Reluctant Hero with Depth \
1.Character Archetype \
. A scholar forced to interpret an ancient prophecy. \
. A thief who unknowingly steals a world-changing relic. \
. A cursed noble trying to break a dark legacy. \
. A simple villager marked by an unknowable force. \
2.Personal Struggles and Internal Conflicts \
. Are they running from a past mistake, a tragic loss, or a dark secret? \
. What is their greatest fear? How does it shape their actions? \
. Are they forced into heroism, or do they fight against their fate? \
3.Strengths and Weaknesses \
. Are they brilliant but physically weak? \
. Are they powerful but morally conflicted? \
. Are they gifted but cursed with an uncontrollable force? \
4.Motivations and Goals \
. Do they seek revenge, redemption, freedom, or knowledge? \
. Are they a pawn of destiny or a rogue agent fighting fate? \
Supporting Cast: Allies, Rivals, and Villains \
1.The Mentor or Enigmatic Guide \
. A fallen knight hiding from past sins. \
. A cursed mage who sees the hero as their last hope. \
. A mysterious prophet who speaks in riddles. \
2.The Rival or Competitor \
. An ambitious rogue with conflicting ideals. \
. An embittered sibling seeking vengeance. \
. A corrupted former friend who sees the hero as a danger. \
3.The Loyal Companion \
. A childhood friend, reluctant but loyal. \
. A mystical creature with a cryptic purpose. \
. An outlawed warrior seeking redemption. \
4.The Villain: A Nuanced Adversary \
. Are they truly evil, or do they believe they are the hero? \
. Do they see the protagonist as a danger to the world? \
. Were they once a hero themselves? \
The Quest: Challenges, Betrayals, and Revelations \
1.The Artifact: A Relic of Power and Mystery \
. What is its true history? Was it forged by gods, stolen from demons, or sealed away for eternity? \
. Is it a weapon, a source of knowledge, or a cursed object best left hidden? \
. Does it have a consciousness of its own? \
2. Trials and Dangers Along the Journey \
. Treacherous ruins filled with ancient traps and forgotten knowledge. \
. Political intrigue—factions vying for control of the artifact. \
. Betrayals from allies who turn against the hero. \
3. Unexpected Twists \
. What if the artifact is more dangerous than the villain? \
. What if the villain is trying to protect the world from it? \
. What if the protagonist is destined to destroy it instead of use it? \
Writing Style and Atmosphere \
1. Epic, Immersive, and Emotionally Gripping \
. Evoke mystery, wonder, and tension. \
. Use vivid sensory details: \
. The scent of ancient books in a forgotten library. \
. The eerie glow of forbidden magic. \
. The deafening silence before a battle of titanic forces. \
2. Balance of Action, Dialogue, and Introspection \
. Ensure a mix of thrilling battles, heartfelt conversations, and deep character introspection. \
3. Impactful Conclusion \
. The ending should feel earned, whether triumphant, tragic, bittersweet, or open-ended. \
Expanded Additional Instructions \
1. Length: The story should be 7,000 – 12,000 words to allow deep world-building and complex characters. \
2. Perspective & Tense: Write in third-person past tense, focusing on the protagonist’s journey. \
3.Story Structure: Follow a classic three-act structure: \
. Act 1: Call to adventure and initial resistance. \
. Act 2: The journey, conflicts, and growth. \
. Act 3: The climactic confrontation and resolution. \
4. Themes: Explore fate vs. free will, the cost of power, the nature of heroism, and the burden of destiny. \
5. Dialogue: Keep it natural and impactful, revealing character depth. \
6. Language Style: Use eloquent, immersive prose that enhances the grand fantasy setting."




Send requests to WireMock

export WIREMOCK_LB=$(kubectl get service wiremock-lb -n wiremock --output=jsonpath='{.status.loadBalancer.ingress[0].hostname}')


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











Send requests to Data Plane
https://platform.openai.com/docs/api-reference/chat/create
https://platform.openai.com/docs/api-reference/chat/create#chat-create-max_completion_tokens


kubectl scale deployment kong-kong -n kong-dp --replicas=3

export DATAPLANE_LB=$(kubectl get service -n kong-dp kong-kong-proxy --output=jsonpath='{.status.loadBalancer.ingress[0].hostname}')

kubectl logs -f $(kubectl get pod -n kong-dp -o json | jq -r '.items[].metadata | select(.name | startswith("kong-"))' | jq -r '.name') -n kong-dp


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

 | jq '.choices[].message.content'



     "max_completion_tokens": 200



