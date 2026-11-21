class Solution:
    def rangeUpdateQueries(self, arr: list[int], queries: list[list[int]]) -> list[int]:
        a = list(arr)
        ans = []
        for q in queries:
            if q[0] == 1:
                l, r, u = q[1] - 1, q[2] - 1, q[3]
                for i in range(l, r + 1):
                    a[i] += u
            else:
                k = q[1] - 1
                ans.append(a[k])
        return ans
