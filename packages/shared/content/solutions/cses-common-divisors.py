from typing import List

class Solution:
    def commonDivisors(self, arr: List[int]) -> int:
        max_val = max(arr)
        cnt = [0] * (max_val + 1)
        for x in arr:
            cnt[x] += 1
        for g in range(max_val, 0, -1):
            multiples = 0
            for k in range(g, max_val + 1, g):
                multiples += cnt[k]
                if multiples >= 2:
                    return g
        return 1
