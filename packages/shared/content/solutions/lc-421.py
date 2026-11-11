# verify: skip-stress
from typing import List

class Solution:
    def findMaximumXOR(self, nums: List[int]) -> int:
        best = 0
        for bit in range(30, -1, -1):
            prefixes = {x >> bit for x in nums}
            cand = (best << 1) | 1
            ok = any((cand ^ p) in prefixes for p in prefixes)
            best = cand if ok else (best << 1)
        return best