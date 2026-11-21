class Solution:
    def staticRangeMinimumQueries(self, arr: list[int], queries: list[list[int]]) -> list[int]:
        ans = []
        for q in queries:
            a, b = q[0] - 1, q[1] - 1
            ans.append(min(arr[a:b + 1]))
        return ans
