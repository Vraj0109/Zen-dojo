from typing import List

class Solution:
    def pairProductSum(self, d: List[int]) -> int:
        s = sum(d)
        sq = sum(x * x for x in d)
        return (s * s - sq) // 2
