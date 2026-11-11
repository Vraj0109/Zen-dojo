from typing import List

class Solution:
    def oddManOut(self, codes: List[int]) -> int:
        x = 0
        for c in codes:
            x ^= c
        return x
