# verify: skip-stress
from typing import List

class Solution:
    def eraseOverlapIntervals(self, intervals: List[List[int]]) -> int:
        intervals.sort(key=lambda x: x[1])
        removed = 0
        end = -float('inf')
        for iv in intervals:
            if iv[0] >= end:
                end = iv[1]
            else:
                removed += 1
        return removed