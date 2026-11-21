from typing import List

class Solution:
    def splitArray(self, nums: List[int], k: int) -> int:
        n = len(nums)
        prefix = [0] * (n + 1)
        for i in range(n):
            prefix[i + 1] = prefix[i] + nums[i]

        dp = [[10**18] * (n + 1) for _ in range(k + 1)]
        dp[0][0] = 0

        for j in range(1, k + 1):
            for i in range(1, n + 1):
                for p in range(i):
                    part_sum = prefix[i] - prefix[p]
                    cost = max(dp[j - 1][p], part_sum)
                    if cost < dp[j][i]:
                        dp[j][i] = cost
        return dp[k][n]
