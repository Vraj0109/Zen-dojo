from typing import List

class Solution:
    def ferrisWheel(self, weights: List[int], x: int) -> int:
        weights.sort()
        i, j = 0, len(weights) - 1
        gondolas = 0
        while i <= j:
            if i < j and weights[i] + weights[j] <= x:
                i += 1
            j -= 1
            gondolas += 1
        return gondolas
