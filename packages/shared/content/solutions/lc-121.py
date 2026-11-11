class Solution:
    def maxProfit(self, prices: List[int]) -> int:
        low = float('inf')
        best = 0
        for p in prices:
            low = min(low, p)
            best = max(best, p - low)
        return best
