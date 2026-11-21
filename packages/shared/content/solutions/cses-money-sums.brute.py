from typing import List

class Solution:
    def moneySums(self, coins: List[int]) -> List[int]:
        mask = 1
        for c in coins:
            mask |= (mask << c)
        ans = []
        s = 1
        mask >>= 1
        while mask > 0:
            if mask & 1:
                ans.append(s)
            mask >>= 1
            s += 1
        return ans
