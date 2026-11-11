from typing import List

class Solution:
    def cheapestMix(self, k: int, p: List[int]) -> int:
        return sum(sorted(p)[:k])
