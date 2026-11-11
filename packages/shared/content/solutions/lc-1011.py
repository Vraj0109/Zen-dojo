# verify: skip-stress
from typing import List

class Solution:
    def shipWithinDays(self, weights: List[int], days: int) -> int:
        lo, hi = max(weights), sum(weights)
        while lo < hi:
            mid = lo + (hi - lo) // 2
            used = 1
            load = 0
            for w in weights:
                if load + w > mid:
                    used += 1
                    load = 0
                load += w
            if used <= days:
                hi = mid
            else:
                lo = mid + 1
        return lo