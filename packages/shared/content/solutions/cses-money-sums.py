from typing import List

class Solution:
    def moneySums(self, coins: List[int]) -> List[int]:
        bs = 1
        for c in coins:
            bs |= (bs << c)
        res = []
        val = bs >> 1
        idx = 1
        while val > 0:
            if val & 1:
                res.append(idx)
            val >>= 1
            idx += 1
        return res
