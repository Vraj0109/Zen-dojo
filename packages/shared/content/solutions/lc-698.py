# verify: skip-stress
from typing import List

class Solution:
    def canPartitionKSubsets(self, nums: List[int], k: int) -> bool:
        n = len(nums)
        total = sum(nums)
        if total % k != 0:
            return False
        target = total // k
        for x in nums:
            if x > target:
                return False
        fill = [-1] * (1 << n)
        fill[0] = 0
        for mask in range(1 << n):
            if fill[mask] < 0:
                continue
            for i in range(n):
                if mask & (1 << i):
                    continue
                if fill[mask] + nums[i] > target:
                    continue
                nm = mask | (1 << i)
                if fill[nm] < 0:
                    fill[nm] = (fill[mask] + nums[i]) % target
        return fill[(1 << n) - 1] == 0