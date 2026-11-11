# verify: skip-stress
from typing import List

class Solution:
    def coinChange(self, coins: List[int], amount: int) -> int:
        fewest = [amount + 1] * (amount + 1)
        fewest[0] = 0
        for a in range(1, amount + 1):
            for c in coins:
                if c <= a:
                    fewest[a] = min(fewest[a], fewest[a - c] + 1)
        return -1 if fewest[amount] > amount else fewest[amount]