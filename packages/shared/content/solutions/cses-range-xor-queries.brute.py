import functools
import operator

class Solution:
    def rangeXorQueries(self, arr: list[int], queries: list[list[int]]) -> list[int]:
        ans = []
        for a, b in queries:
            ans.append(functools.reduce(operator.xor, arr[a - 1:b], 0))
        return ans
