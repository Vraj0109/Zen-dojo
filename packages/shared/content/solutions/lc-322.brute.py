from typing import List

class Solution:
    def coinChange(self, coins: List[int], amount: int) -> int:
        def dfs(rem: int) -> int:
            if rem == 0:
                return 0
            if rem < 0:
                return -1
            min_coins = -1
            for c in coins:
                sub = dfs(rem - c)
                if sub >= 0:
                    if min_coins == -1 or sub + 1 < min_coins:
                        min_coins = sub + 1
            return min_coins
        return dfs(amount)
