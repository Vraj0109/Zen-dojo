# verify: skip-stress
from typing import List

class Solution:
    def containsNearbyAlmostDuplicate(self, nums: List[int], indexDiff: int, valueDiff: int) -> bool:
        if valueDiff < 0:
            return False
        buckets = {}
        w = valueDiff + 1
        for i, x in enumerate(nums):
            m = x // w
            if m in buckets:
                return True
            if m - 1 in buckets and abs(x - buckets[m - 1]) <= valueDiff:
                return True
            if m + 1 in buckets and abs(x - buckets[m + 1]) <= valueDiff:
                return True
            buckets[m] = x
            if i >= indexDiff:
                del buckets[nums[i - indexDiff] // w]
        return False