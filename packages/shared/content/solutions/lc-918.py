# verify: skip-stress
from typing import List

class Solution:
    def maxSubarraySumCircular(self, nums: List[int]) -> int:
        total = cur_max = cur_min = 0
        best = worst = nums[0]
        for x in nums:
            total += x
            cur_max = max(cur_max + x, x)
            best = max(best, cur_max)
            cur_min = min(cur_min + x, x)
            worst = min(worst, cur_min)
        return best if best < 0 else max(best, total - worst)