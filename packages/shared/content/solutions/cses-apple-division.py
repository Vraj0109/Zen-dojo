from typing import List

class Solution:
    def appleDivision(self, weights: List[int]) -> int:
        n = len(weights)
        total = sum(weights)
        best = float('inf')
        for mask in range(1 << n):
            s = sum(weights[i] for i in range(n) if (mask & (1 << i)))
            best = min(best, abs(total - 2 * s))
        return best
