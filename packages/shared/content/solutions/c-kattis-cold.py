from typing import List

class Solution:
    def countNegativeTemperatures(self, temps: List[int]) -> int:
        return sum(1 for t in temps if t < 0)
