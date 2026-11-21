from typing import List

class Solution:
    def pairProductSum(self, d: List[int]) -> int:
        n = len(d)
        total = 0
        for i in range(n):
            for j in range(i + 1, n):
                total += d[i] * d[j]
        return total
