from typing import List

class Solution:
    def removalGame(self, arr: List[int]) -> int:
        n = len(arr)
        total = sum(arr)
        dp = [x for x in arr]
        for length in range(2, n + 1):
            for i in range(n - length + 1):
                j = i + length - 1
                dp[i] = max(arr[i] - dp[i + 1], arr[j] - dp[i])
        return (total + dp[0]) // 2
