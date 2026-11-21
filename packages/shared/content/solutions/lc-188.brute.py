class Solution:
    def maxProfit(self, k: int, prices: list[int]) -> int:
        n = len(prices)

        def dfs(day: int, transactions_left: int, holding: bool) -> int:
            if day == n or (transactions_left == 0 and not holding):
                return 0

            res = dfs(day + 1, transactions_left, holding)
            if holding:
                res = max(res, prices[day] + dfs(day + 1, transactions_left, False))
            elif transactions_left > 0:
                res = max(res, -prices[day] + dfs(day + 1, transactions_left - 1, True))
            return res

        return dfs(0, k, False)
