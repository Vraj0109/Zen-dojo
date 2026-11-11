# verify: skip-stress
from typing import List

class Solution:
    def maxProfit(self, prices: List[int]) -> int:
        hold = -float('inf')
        sold = 0
        rest = 0
        for p in prices:
            prev_sold = sold
            sold = hold + p
            hold = max(hold, rest - p)
            rest = max(rest, prev_sold)
        return max(sold, rest)