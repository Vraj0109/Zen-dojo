from typing import List

class Solution:
    def playDays(self, n: int, a: List[int]) -> int:
        s = sum(a)
        return -1 if s > n else n - s
