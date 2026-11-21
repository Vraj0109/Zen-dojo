from typing import List

class Solution:
    def missingCoinSum(self, coins: List[int]) -> int:
        coins.sort()
        reach = 0
        for c in coins:
            if c > reach + 1:
                break
            reach += c
        return reach + 1
