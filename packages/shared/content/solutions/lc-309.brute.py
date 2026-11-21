class Solution:
    def maxProfit(self, prices: list[int]) -> int:
        def dfs(i: int, state: int) -> int:
            if i >= len(prices):
                return 0
            if state == 0:
                # rest or buy
                return max(dfs(i + 1, 0), -prices[i] + dfs(i + 1, 1))
            elif state == 1:
                # hold or sell
                return max(dfs(i + 1, 1), prices[i] + dfs(i + 1, 2))
            else:
                # cooldown
                return dfs(i + 1, 0)

        return dfs(0, 0)
