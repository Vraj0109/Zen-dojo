from typing import List

class Solution:
    def mostLikelyDiceSums(self, n: int, m: int) -> List[int]:
        lo = min(n, m) + 1
        hi = max(n, m) + 1
        return list(range(lo, hi + 1))
