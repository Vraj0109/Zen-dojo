from typing import List

class Solution:
    def canPartition(self, nums: List[int]) -> bool:
        total = sum(nums)
        if total % 2 != 0:
            return False
        target = total // 2
        def dfs(i: int, rem: int) -> bool:
            if rem == 0:
                return True
            if rem < 0 or i >= len(nums):
                return False
            return dfs(i + 1, rem - nums[i]) or dfs(i + 1, rem)
        return dfs(0, target)
