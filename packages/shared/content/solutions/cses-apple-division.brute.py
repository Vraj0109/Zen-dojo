from typing import List

class Solution:
    def appleDivision(self, weights: List[int]) -> int:
        n = len(weights)
        total = sum(weights)
        best = total
        for mask in range(1 << n):
            s = 0
            for i in range(n):
                if mask & (1 << i):
                    s += weights[i]
            diff = abs(total - 2 * s)
            if diff < best:
                best = diff
        return best
