from typing import List

class Solution:
    def twoKnights(self, n: int) -> List[int]:
        res = []
        for k in range(1, n + 1):
            total = (k * k) * (k * k - 1) // 2
            attack = 4 * (k - 1) * (k - 2)
            res.append(total - attack)
        return res
