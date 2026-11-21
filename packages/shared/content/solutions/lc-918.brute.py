from typing import List

class Solution:
    def maxSubarraySumCircular(self, nums: List[int]) -> int:
        n = len(nums)
        best = nums[0]
        for i in range(n):
            s = 0
            for l in range(1, n + 1):
                s += nums[(i + l - 1) % n]
                if s > best:
                    best = s
        return best
