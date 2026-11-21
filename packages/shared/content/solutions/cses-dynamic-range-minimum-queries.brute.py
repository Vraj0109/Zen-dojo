class Solution:
    def dynamicRangeMinimumQueries(self, arr: list[int], queries: list[list[int]]) -> list[int]:
        a = list(arr)
        ans = []
        for q in queries:
            if q[0] == 1:
                k, u = q[1] - 1, q[2]
                a[k] = u
            else:
                l, r = q[1] - 1, q[2] - 1
                ans.append(min(a[l:r + 1]))
        return ans
