class Solution:
    def subarraySumQueries(self, arr: list[int], queries: list[list[int]]) -> list[int]:
        a = list(arr)
        ans = []
        for k, x in queries:
            a[k - 1] = x
            max_so_far, cur = 0, 0
            for v in a:
                cur += v
                if cur < 0:
                    cur = 0
                if cur > max_so_far:
                    max_so_far = cur
            ans.append(max_so_far)
        return ans
