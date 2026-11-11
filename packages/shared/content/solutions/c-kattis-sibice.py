from typing import List

class Solution:
    def checkMatchesFit(self, w: int, h: int, matches: List[int]) -> List[bool]:
        maxSq = w * w + h * h
        return [m * m <= maxSq for m in matches]
