from typing import List

class Solution:
    def minEatingSpeed(self, piles: List[int], h: int) -> int:
        max_p = max(piles)
        for k in range(1, max_p + 1):
            hours = sum((p + k - 1) // k for p in piles)
            if hours <= h:
                return k
        return max_p
