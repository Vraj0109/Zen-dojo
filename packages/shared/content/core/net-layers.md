---
id: net-layers
title: Layers
area: core
section: Computer networks
---

## Overview

Network layers separate concerns: each layer adds its own header and relies on the layer below. Knowing which layer a device or protocol works at explains what it can see and do.

## What to know

1. OSI vs TCP/IP model :: OSI has 7 layers (physical, data link, network, transport, session, presentation, application); the TCP/IP model used in practice has 4 (link, internet, transport, application). Interviews mostly use L2 (Ethernet/MAC), L3 (IP), L4 (TCP/UDP) and L7 (HTTP).

2. What each layer adds (frames, packets, segments) :: Application data is wrapped in a transport segment (TCP: ports, sequence numbers), then an IP packet (source and destination IP), then a link-layer frame (MAC addresses) sent on the wire. Each hop's router strips and rebuilds the frame but keeps the IP packet.

3. Encapsulation :: Each layer adds a header on the way down and the receiver removes them on the way up, so a layer only needs to understand its own header. Tunnels (VPNs, VXLAN) wrap a whole packet inside another packet.

4. Where load balancers, proxies and firewalls sit :: Switches work at L2 (MAC addresses), routers at L3 (IP), L4 load balancers and firewalls look at IPs and ports, and L7 load balancers, API gateways and WAFs read HTTP. The higher the layer, the smarter the decisions and the more CPU per request.

## Recap

- TCP/IP: link (frames, MAC) → internet (packets, IP) → transport (segments, TCP/UDP ports) → application.
- Encapsulation: each layer wraps the payload with its header.
- L4 devices see IP:port; L7 devices see HTTP (paths, headers, cookies).
- Firewalls/security groups filter at L3/L4; WAFs inspect L7.

## Go deeper

### OSI vs TCP/IP, layer by layer {point: 0}

OSI has seven layers: 1 physical (bits on a wire or radio), 2 data link (frames between directly connected nodes, MAC addresses, Ethernet, Wi-Fi), 3 network (packets routed across networks, IP), 4 transport (end-to-end delivery between processes, ports, TCP/UDP), 5 session (dialog management), 6 presentation (encoding, encryption, compression), 7 application (HTTP, DNS, SMTP). The TCP/IP model used in practice merges these into four: link (OSI 1-2), internet (3), transport (4), application (5-7).

Units: frames at the link layer, packets (datagrams) at the network layer, segments (TCP) or datagrams (UDP) at transport, messages at the application layer. Each layer adds a header (and the link layer a trailer with a checksum) and treats everything above as payload. MTU (typically 1500 bytes on Ethernet) limits packet size; TCP picks a maximum segment size to fit, and path MTU discovery avoids fragmentation.

Interviewers use the layers mainly to check that you know where a device or protocol operates and what information it can see.

### One HTTP request through the layers {point: 2}

Application: 'GET /cart HTTP/1.1, Host: shop.com'. Transport: TCP segment with source port 52144, destination port 443, sequence numbers. Internet: IP packet from 10.0.0.5 to 203.0.113.10, TTL 64. Link: Ethernet frame to the gateway's MAC address. Each router strips the frame, reads the IP header, decrements TTL, and re-frames for the next hop; the IP header stays end to end (except NAT rewriting).

At the server, the layers are unwrapped in reverse, and the kernel hands the byte stream to the process listening on port 443.

### Following a packet across the internet {point: 2.5}

Your laptop wants to send to 142.250.x.x. It checks its routing table: not in the local subnet, so send to the default gateway. ARP resolves the gateway's MAC address. The frame goes to the home router, which performs NAT (rewrites the private source IP and port to its public IP and a port, recording the mapping) and forwards to the ISP. Routers along the way look up the destination prefix in their forwarding tables (longest prefix match), decrement TTL (packets with TTL 0 are dropped and an ICMP Time Exceeded is sent back, which is how traceroute works), and forward out the next interface. Between networks (autonomous systems), BGP has decided the paths. At the destination network, the packet reaches a load balancer or server; responses take the reverse path, and the home router's NAT table translates them back.

Each hop re-frames the packet for its link; the IP header (except TTL, checksum, and NAT changes) and the TCP payload stay the same end to end; with TLS the payload is encrypted, so middle boxes can see IPs and ports, and the hostname only through SNI.

### Where infrastructure sits {point: 3}

Switches: L2 (MAC addresses within a LAN). Routers: L3 (IP between networks). NAT gateways: L3/L4 (rewrite addresses/ports). Network load balancers (AWS NLB): L4, pass TCP through, preserve client IP, very high throughput. Application load balancers / reverse proxies (ALB, Nginx, Envoy): L7, terminate TLS and route on HTTP. CDNs: L7 at the edge.

Saying which layer a component works at explains what it can and can't do (an L4 balancer can't route /api vs /static).

### Middleboxes: firewalls, NAT, load balancers, proxies {point: 3}

Stateless packet filters (network ACLs) allow or deny by IP, protocol and port per packet. Stateful firewalls (security groups) track connections, so return traffic for allowed outbound connections is allowed automatically. Next-generation firewalls and WAFs inspect application data (HTTP paths, SQL injection patterns), which requires terminating or inspecting TLS.

NAT lets many private hosts share one public IP; it breaks inbound connections unless ports are forwarded, and peer-to-peer apps use STUN/TURN/ICE to traverse it. Carrier-grade NAT puts many customers behind one address, which is why IP-based rate limiting can hit innocent users.

Load balancers: L4 forward TCP/UDP flows by connection (fast, can preserve client IP); L7 terminate HTTP, route by content and add headers like X-Forwarded-For. Proxies sit at L7 on behalf of clients (forward) or servers (reverse). Knowing each one's layer explains features and limits: you can't route by URL on an L4 balancer, and a firewall can't read HTTPS headers without terminating TLS.

## Interview questions

- At which layer does a load balancer that routes by URL path operate?
- What does a router change in a packet as it forwards it?
