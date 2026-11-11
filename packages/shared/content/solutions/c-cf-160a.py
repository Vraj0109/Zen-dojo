from typing import List

class Solution:
    def twinsCoins(self, coins: List[int]) -> int:
        coins.sort(reverse=True)
        total = sum(coins)
        mine = 0
        count = 0
        for c in coins:
            mine += c
            count += 1
            if 2 * mine > total:
                break
        return count
