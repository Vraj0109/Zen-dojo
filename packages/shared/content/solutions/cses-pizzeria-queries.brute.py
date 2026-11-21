class Solution:
    def pizzeriaQueries(self, prices: list[int], queries: list[list[int]]) -> list[int]:
        p = list(prices)
        n = len(p)
        ans = []
        for q in queries:
            if q[0] == 1:
                k, x = q[1] - 1, q[2]
                p[k] = x
            else:
                k = q[1] - 1
                best = p[k]
                for i in range(n):
                    cost = p[i] + abs(i - k)
                    if cost < best:
                        best = cost
                ans.append(best)
        return ans
