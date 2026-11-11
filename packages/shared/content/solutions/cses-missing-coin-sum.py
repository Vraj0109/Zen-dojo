from typing import List

class Solution:
    def missingCoinSum(self, coins: List[int]) -> int:
        coins.sort()
        reach = 1
        for c in coins:
            if c > reach:
                break
            reach += c
        return reach
