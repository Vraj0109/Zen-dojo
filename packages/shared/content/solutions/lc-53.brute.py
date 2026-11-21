from typing import List

class Solution:
    def maxSubArray(self, nums: List[int]) -> int:
        n = len(nums)
        best = nums[0]
        for i in range(n):
            s = 0
            for j in range(i, n):
                s += nums[j]
                if s > best:
                    best = s
        return best
