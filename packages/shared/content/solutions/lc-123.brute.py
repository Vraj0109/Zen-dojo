class Solution:
    def maxProfit(self, prices: list[int]) -> int:
        n = len(prices)
        if n <= 1:
            return 0

        left = [0] * n
        min_price = prices[0]
        for i in range(1, n):
            min_price = min(min_price, prices[i])
            left[i] = max(left[i - 1], prices[i] - min_price)

        right = [0] * n
        max_price = prices[n - 1]
        for i in range(n - 2, -1, -1):
            max_price = max(max_price, prices[i])
            right[i] = max(right[i + 1], max_price - prices[i])

        return max(left[i] + right[i] for i in range(n))
