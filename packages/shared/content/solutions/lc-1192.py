# verify: skip-stress
from typing import List

class Solution:
    def criticalConnections(self, n: int, connections: List[List[int]]) -> List[List[int]]:
        g = [[] for _ in range(n)]
        for i, (u, v) in enumerate(connections):
            g[u].append((v, i))
            g[v].append((u, i))
        disc = [-1] * n
        low = [0] * n
        it = [0] * n
        parent_edge = [-1] * n
        parent = [-1] * n
        out = []
        timer = 0
        st = [0]
        disc[0] = low[0] = timer
        timer += 1
        while st:
            u = st[-1]
            if it[u] < len(g[u]):
                v, eid = g[u][it[u]]
                it[u] += 1
                if eid == parent_edge[u]:
                    continue
                if disc[v] == -1:
                    disc[v] = low[v] = timer
                    timer += 1
                    parent[v] = u
                    parent_edge[v] = eid
                    st.append(v)
                else:
                    low[u] = min(low[u], disc[v])
            else:
                st.pop()
                p = parent[u]
                if p != -1:
                    low[p] = min(low[p], low[u])
                    if low[u] > disc[p]:
                        out.append([p, u])
        return out