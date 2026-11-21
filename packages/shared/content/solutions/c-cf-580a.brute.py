from typing import List

class Solution:
    def longestNonDecreasingRun(self, a: List[int]) -> int:
        n = len(a)
        max_len = 0
        for i in range(n):
            for j in range(i, n):
                ok = True
                for k in range(i, j):
                    if a[k] > a[k + 1]:
                        ok = False
                        break
                if ok:
                    max_len = max(max_len, j - i + 1)
        return max_len
