from collections import deque

class Solution:
    def subordinates(self, n: int, bosses: list[int]) -> list[int]:
        adj = [[] for _ in range(n + 1)]
        for i in range(n - 1):
            emp = i + 2
            boss = bosses[i]
            adj[boss].append(emp)
        ans = [0] * n
        for i in range(1, n + 1):
            count = 0
            q = deque([i])
            while q:
                u = q.popleft()
                for v in adj[u]:
                    count += 1
                    q.append(v)
            ans[i - 1] = count
        return ans
