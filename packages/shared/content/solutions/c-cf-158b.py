from typing import List

class Solution:
    def taxi(self, groups: List[int]) -> int:
        c = [0] * 5
        for g in groups:
            c[g] += 1
        taxis = c[4] + c[3]
        ones = max(0, c[1] - c[3])
        taxis += c[2] // 2
        if c[2] % 2:
            taxis += 1
            ones = max(0, ones - 2)
        taxis += (ones + 3) // 4
        return taxis
