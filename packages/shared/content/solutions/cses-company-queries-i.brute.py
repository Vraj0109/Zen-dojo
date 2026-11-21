class Solution:
    def companyQueriesI(self, n: int, bosses: list[int], queries: list[list[int]]) -> list[int]:
        par = [0] * (n + 1)
        for i in range(n - 1):
            par[i + 2] = bosses[i]
        ans = []
        for x, k in queries:
            cur = x
            while k > 0 and cur != 0:
                cur = par[cur]
                k -= 1
            ans.append(-1 if cur == 0 else cur)
        return ans
