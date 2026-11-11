from typing import List

class Solution:
    def coinWays(self, coins: List[int], target: int) -> int:
        MOD = 1000000007
        ways = [0] * (target + 1)
        ways[0] = 1
        for c in coins:
            for s in range(c, target + 1):
                ways[s] = (ways[s] + ways[s - c]) % MOD
        return ways[target]
