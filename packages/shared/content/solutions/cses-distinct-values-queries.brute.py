class Solution:
    def distinctValuesQueries(self, arr: list[int], queries: list[list[int]]) -> list[int]:
        ans = []
        for a, b in queries:
            ans.append(len(set(arr[a - 1:b])))
        return ans
