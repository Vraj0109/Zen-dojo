from typing import List

class Solution:
    def change(self, amount: int, coins: List[int]) -> int:
        def dfs(rem: int, idx: int) -> int:
            if rem == 0:
                return 1
            if rem < 0 or idx >= len(coins):
                return 0
            return dfs(rem - coins[idx], idx) + dfs(rem, idx + 1)
        return dfs(amount, 0)
