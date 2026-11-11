# verify: skip-stress
from typing import List

class Solution:
    def fallingSquares(self, positions: List[List[int]]) -> List[int]:
        placed = []
        ans = []
        best = 0
        for l, size in positions:
            r = l + size
            base = 0
            for ql, qr, qtop in placed:
                if l < qr and ql < r:
                    base = max(base, qtop)
            top = base + size
            placed.append((l, r, top))
            best = max(best, top)
            ans.append(best)
        return ans