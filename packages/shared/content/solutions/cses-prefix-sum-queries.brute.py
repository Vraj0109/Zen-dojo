class Solution:
    def prefixSumQueries(self, arr: list[int], queries: list[list[int]]) -> list[int]:
        a = list(arr)
        ans = []
        for q in queries:
            if q[0] == 1:
                k, u = q[1] - 1, q[2]
                a[k] = u
            else:
                l, r = q[1] - 1, q[2] - 1
                cur, max_pref = 0, 0
                for i in range(l, r + 1):
                    cur += a[i]
                    if cur > max_pref:
                        max_pref = cur
                ans.append(max_pref)
        return ans
