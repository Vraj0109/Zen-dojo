from typing import List

class Solution:
    def jump(self, nums: List[int]) -> int:
        n = len(nums)
        dp = [10**9] * n
        dp[0] = 0
        for i in range(n):
            for j in range(1, nums[i] + 1):
                if i + j < n:
                    if dp[i] + 1 < dp[i + j]:
                        dp[i + j] = dp[i] + 1
        return dp[n - 1]
