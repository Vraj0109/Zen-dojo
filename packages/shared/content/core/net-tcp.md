---
id: net-tcp
title: TCP internals
area: core
section: Computer networks
---

## Overview

TCP turns unreliable packets into a reliable, ordered byte stream and adapts its sending rate to the network. Its mechanics explain connection costs, latency on lossy networks and why connection pooling matters.

## What to know

1. Three-way handshake and teardown (TIME_WAIT) :: Setup: SYN → SYN-ACK → ACK (1 round trip before data). Teardown: FIN and ACK from each side. The side that closes first sits in TIME_WAIT for 2×MSL (often 60 s) so stray packets don't confuse a new connection on the same ports; busy clients making many short connections can run out of ports, so reuse connections.

2. Reliable delivery: sequence numbers, ACKs, retransmission :: Every byte has a sequence number; the receiver acknowledges what it has received in order. Missing data is retransmitted after a timeout or after 3 duplicate ACKs (fast retransmit). The receiver reorders out-of-order segments before handing data to the application.

3. Flow control (sliding window) :: The receiver advertises a window (how much it can buffer) and the sender never has more than that unacknowledged, so a fast sender can't overwhelm a slow receiver.

4. Congestion control (slow start, AIMD) :: The sender limits itself to protect the network. Slow start doubles the congestion window every round trip from a small start; congestion avoidance grows it linearly and halves it on loss (additive increase, multiplicative decrease). New connections start slow, which is another reason to reuse them. BBR models bandwidth and delay instead of reacting to loss.

5. Head-of-line blocking :: Because TCP delivers bytes in order, one lost segment blocks everything behind it until it's retransmitted, even data for unrelated HTTP/2 streams. QUIC fixes this with independent streams.

6. Nagle and keep-alive :: Nagle's algorithm batches small writes until earlier data is acknowledged, which saves packets but adds latency for interactive traffic (often disabled with TCP_NODELAY). TCP keepalive probes idle connections so dead peers are detected and middleboxes don't drop them.

## Recap

- Handshake SYN → SYN-ACK → ACK (1 RTT); teardown FIN/ACK; the closer waits in TIME_WAIT (2×MSL).
- Reliability: sequence numbers, cumulative ACKs, retransmit on timeout or 3 duplicate ACKs.
- Flow control: receiver window; congestion control: slow start, AIMD, (Cubic/BBR).
- Nagle batches small writes; disable (TCP_NODELAY) for latency-sensitive small messages.

## Go deeper

### Handshake, teardown and the state machine {point: 0}

Opening: the client sends SYN with its initial sequence number (ISN, randomized to resist spoofing); the server replies SYN-ACK with its own ISN and acknowledges the client's; the client sends ACK. Options are negotiated here: MSS, window scaling, selective acknowledgements (SACK), timestamps. A server under a SYN flood can use SYN cookies to avoid storing state for half-open connections.

Closing: each direction closes independently. The side that closes first sends FIN, gets ACK; the other side eventually sends its own FIN and gets ACK. The active closer then waits in TIME_WAIT for 2 × MSL (often 60 s total) so delayed packets of the old connection die out and the final ACK can be retransmitted if lost. A RST aborts a connection immediately (sent for connections to closed ports, or by applications/middleboxes).

States to recognize in netstat/ss: LISTEN, SYN_SENT, SYN_RECEIVED, ESTABLISHED, FIN_WAIT_1/2, CLOSE_WAIT (the peer closed, but your application hasn't closed its socket yet, so many of these mean a leak in your code), LAST_ACK, TIME_WAIT.

### TIME_WAIT and connection exhaustion {point: 0.5}

The side that closes first keeps the (src IP, src port, dst IP, dst port) tuple in TIME_WAIT for ~60 s so late packets from the old connection aren't confused with a new one. A client opening and closing thousands of short connections per second to one server can run out of ephemeral ports (~28k-60k) on that tuple.

Fixes: connection pooling/keep-alive (best), letting the server close, more source IPs, or tcp_tw_reuse for outgoing connections.

### Reliability and flow control mechanics {point: 1}

Sequence numbers count bytes. The receiver acknowledges the next byte it expects (cumulative ACK); out-of-order segments are buffered, and SACK tells the sender exactly which ranges arrived so it retransmits only the gaps. Retransmission timeout (RTO) is computed from smoothed round-trip time and its variance; on timeout, the RTO doubles (exponential backoff). Three duplicate ACKs trigger fast retransmit without waiting for the timeout.

Flow control: the receiver advertises a receive window (free buffer space); the sender never has more unacknowledged bytes in flight than that window. Window scaling allows windows beyond 64 KB, which is needed for high bandwidth × delay paths: to fill a 1 Gbps link with 100 ms RTT you need ~12.5 MB in flight (the bandwidth-delay product). A zero window pauses the sender until the receiver frees space.

Throughput of a single connection is limited by min(receive window, congestion window) / RTT, so long-distance transfers need large windows, and why parallel connections or protocols like QUIC/BBR help on lossy, long paths.

### Congestion control in one picture {point: 3}

The sender may have min(receiver window, congestion window) bytes in flight. Slow start: cwnd starts at ~10 segments and doubles every RTT until loss or the threshold. Congestion avoidance: +1 segment per RTT (additive increase). On loss via duplicate ACKs: halve cwnd (multiplicative decrease) and continue; on timeout: back to slow start.

Consequence for design: a new connection can't use full bandwidth for several RTTs, so short transfers over fresh connections are latency-bound. Reuse connections (pooling, keep-alive, HTTP/2) and keep services close to each other.

### Congestion control algorithms {point: 3}

Congestion control protects the network by adapting the sending rate. Classic Reno: slow start doubles cwnd per RTT from a small initial window (10 segments today) until ssthresh or loss; congestion avoidance then adds about one segment per RTT; on loss detected by duplicate ACKs, halve cwnd (fast recovery); on timeout, reset to 1 segment and slow start again. This sawtooth treats loss as the congestion signal.

CUBIC (Linux default for years) grows cwnd as a cubic function of time since the last loss, recovering quickly on high-bandwidth, high-latency paths. BBR (Google) instead models the path's bottleneck bandwidth and minimum RTT and paces packets at that rate, avoiding filling router buffers (lower latency, better on lossy links), though fairness with loss-based flows has been debated.

Related: Nagle's algorithm delays small writes until outstanding data is acknowledged (combining them), which interacts badly with delayed ACKs for request-response protocols, so latency-sensitive apps set TCP_NODELAY. TCP keep-alive probes idle connections (default after 2 hours, usually tuned lower) so dead peers and NAT timeouts are detected; application-level heartbeats are more common.

## Interview questions

- Walk through the TCP handshake and why it takes a round trip.
- Why do servers end up with many TIME_WAIT sockets?
- Flow control vs congestion control?
