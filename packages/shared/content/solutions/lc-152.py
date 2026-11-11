# verify: skip-stress
from typing import List

class Solution:
    def maxProduct(self, nums: List[int]) -> int:
        cur_max = cur_min = best = nums[0]
        for i in range(1, len(nums)):
            x = nums[i]
            a, b = cur_max * x, cur_min * x
            cur_max = max(x, a, b)
            cur_min = min(x, a, b)
            best = max(best, cur_max)
        return best