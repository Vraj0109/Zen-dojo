from typing import List

class Solution:
    def arrayDescription(self, arr: List[int], m: int) -> int:
        MOD = 1000000007
        n = len(arr)
        dp = [0] * (m + 2)
        if arr[0] == 0:
            for v in range(1, m + 1):
                dp[v] = 1
        else:
            dp[arr[0]] = 1

        for i in range(1, n):
            next_dp = [0] * (m + 2)
            lo = 1 if arr[i] == 0 else arr[i]
            hi = m if arr[i] == 0 else arr[i]
            for v in range(lo, hi + 1):
                next_dp[v] = (dp[v - 1] + dp[v] + dp[v + 1]) % MOD
            dp = next_dp

        ans = 0
        for v in range(1, m + 1):
            ans = (ans + dp[v]) % MOD
        return ans
