from typing import List

class Solution:
    def maxProfit(self, prices: List[int]) -> int:
        def dfs(i: int, holding: bool) -> int:
            if i >= len(prices):
                return 0
            best = dfs(i + 1, holding)
            if holding:
                best = max(best, prices[i] + dfs(i + 1, False))
            else:
                best = max(best, -prices[i] + dfs(i + 1, True))
            return best
        return dfs(0, False)
