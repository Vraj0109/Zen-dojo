class Solution:
    def dynamicRangeSumQueries(self, arr: list[int], queries: list[list[int]]) -> list[int]:
        a = list(arr)
        ans = []
        for q in queries:
            if q[0] == 1:
                k, u = q[1] - 1, q[2]
                a[k] = u
            elif q[0] == 2:
                l, r = q[1] - 1, q[2] - 1
                ans.append(sum(a[l:r + 1]))
        return ans
