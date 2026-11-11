# verify: skip-stress
from typing import List

class Solution:
    def canJump(self, nums: List[int]) -> bool:
        farthest = 0
        n = len(nums)
        for i in range(n):
            if i > farthest:
                return False
            farthest = max(farthest, i + nums[i])
            if farthest >= n - 1:
                return True
        return True