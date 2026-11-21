from typing import List

class Solution:
    def shipWithinDays(self, weights: List[int], days: int) -> int:
        def can_ship(cap: int) -> bool:
            used = 1
            load = 0
            for w in weights:
                if load + w > cap:
                    used += 1
                    load = 0
                load += w
            return used <= days

        lo = max(weights)
        hi = sum(weights)
        for c in range(lo, hi + 1):
            if can_ship(c):
                return c
        return hi
