# verify: skip-stress
from typing import List

class Solution:
    def splitArray(self, nums: List[int], k: int) -> int:
        lo, hi = max(nums), sum(nums)
        while lo < hi:
            mid = (lo + hi) // 2
            cur = 0
            parts = 1
            for x in nums:
                if cur + x > mid:
                    parts += 1
                    cur = 0
                cur += x
            if parts <= k:
                hi = mid
            else:
                lo = mid + 1
        return lo