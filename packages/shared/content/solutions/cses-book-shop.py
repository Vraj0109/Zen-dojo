from typing import List

class Solution:
    def bookShop(self, prices: List[int], pages: List[int], maxPrice: int) -> int:
        dp = [0] * (maxPrice + 1)
        for p, pg in zip(prices, pages):
            for j in range(maxPrice, p - 1, -1):
                if dp[j - p] + pg > dp[j]:
                    dp[j] = dp[j - p] + pg
        return dp[maxPrice]
