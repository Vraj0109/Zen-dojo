from typing import List

class Solution:
    def canJump(self, nums: List[int]) -> bool:
        def can_reach(pos: int) -> bool:
            if pos >= len(nums) - 1:
                return True
            for step in range(1, nums[pos] + 1):
                if can_reach(pos + step):
                    return True
            return False
        return can_reach(0)
