from typing import List

class Solution:
    def stickLengths(self, lengths: List[int]) -> int:
        lengths.sort()
        median = lengths[len(lengths) // 2]
        return sum(abs(x - median) for x in lengths)
