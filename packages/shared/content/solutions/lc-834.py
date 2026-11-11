# verify: skip-stress
from typing import List

class Solution:
    def sumOfDistancesInTree(self, n: int, edges: List[List[int]]) -> List[int]:
        g = [[] for _ in range(n)]
        for u, v in edges:
            g[u].append(v)
            g[v].append(u)
        order = []
        parent = [-1] * n
        st = [0]
        while st:
            u = st.pop()
            order.append(u)
            for v in g[u]:
                if v != parent[u]:
                    parent[v] = u
                    st.append(v)
        cnt = [1] * n
        ans = [0] * n
        for i in range(n - 1, 0, -1):
            u = order[i]
            cnt[parent[u]] += cnt[u]
            ans[parent[u]] += ans[u] + cnt[u]
        for i in range(1, n):
            u = order[i]
            ans[u] = ans[parent[u]] - cnt[u] + (n - cnt[u])
        return ans