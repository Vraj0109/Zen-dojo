from typing import List

class Solution:
    def staticRangeSumQueries(self, arr: List[int], queries: List[List[int]]) -> List[int]:
        n = len(arr)
        pref = [0] * (n + 1)
        for i in range(n):
            pref[i + 1] = pref[i] + arr[i]
        ans = []
        for a, b in queries:
            ans.append(pref[b] - pref[a - 1])
        return ans
