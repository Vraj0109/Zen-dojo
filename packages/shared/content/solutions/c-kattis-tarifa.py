from typing import List

class Solution:
    def tarifa(self, x: int, used: List[int]) -> int:
        return x * (len(used) + 1) - sum(used)
