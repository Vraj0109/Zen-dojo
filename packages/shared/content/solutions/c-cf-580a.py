from typing import List

class Solution:
    def longestNonDecreasingRun(self, a: List[int]) -> int:
        best = 1
        run = 1
        for i in range(1, len(a)):
            run = run + 1 if a[i] >= a[i - 1] else 1
            if run > best:
                best = run
        return best
