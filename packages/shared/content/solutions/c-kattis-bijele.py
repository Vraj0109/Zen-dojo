from typing import List

class Solution:
    def missingPieces(self, found: List[int]) -> List[int]:
        target = [1, 1, 2, 2, 2, 8]
        return [t - f for t, f in zip(target, found)]
