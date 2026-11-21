class Solution:
    def companyQueriesII(self, n: int, bosses: list[int], queries: list[list[int]]) -> list[int]:
        par = [0] * (n + 1)
        for i in range(n - 1):
            par[i + 2] = bosses[i]
        ans = []
        for a, b in queries:
            vis = set()
            cur = a
            while cur != 0:
                vis.add(cur)
                cur = par[cur]
            cur = b
            while cur != 0 and cur not in vis:
                cur = par[cur]
            ans.append(cur)
        return ans
