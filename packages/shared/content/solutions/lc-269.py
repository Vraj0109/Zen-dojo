class Solution:
    def alienOrder(self, words: List[str]) -> str:
        all_chars = set()
        for w in words:
            for c in w:
                all_chars.add(c)

        adj = collections.defaultdict(set)
        in_degree = {c: 0 for c in all_chars}

        for i in range(len(words) - 1):
            w1, w2 = words[i], words[i + 1]
            if len(w1) > len(w2) and w1[:len(w2)] == w2:
                return ""
            for j in range(min(len(w1), len(w2))):
                if w1[j] != w2[j]:
                    if w2[j] not in adj[w1[j]]:
                        adj[w1[j]].add(w2[j])
                        in_degree[w2[j]] += 1
                    break

        heap = sorted([c for c in all_chars if in_degree[c] == 0])
        heapq.heapify(heap)

        order = []
        while heap:
            u = heapq.heappop(heap)
            order.append(u)
            for v in adj[u]:
                in_degree[v] -= 1
                if in_degree[v] == 0:
                    heapq.heappush(heap, v)

        if len(order) < len(all_chars):
            return ""
        return "".join(order)
