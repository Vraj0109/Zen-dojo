from typing import List

class Solution:
    def nextRound(self, scores: List[int], k: int) -> int:
        t = scores[k - 1]
        return sum(1 for s in scores if s >= t and s > 0)
