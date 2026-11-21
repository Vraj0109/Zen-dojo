from typing import List

class Solution:
    def stickLengths(self, lengths: List[int]) -> int:
        best = -1
        for target in lengths:
            cost = sum(abs(x - target) for x in lengths)
            if best == -1 or cost < best:
                best = cost
        return best
