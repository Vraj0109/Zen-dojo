from typing import List

class Solution:
    def eraseOverlapIntervals(self, intervals: List[List[int]]) -> int:
        intervals.sort(key=lambda x: x[0])
        def max_keep(i: int, prev_end: int) -> int:
            if i == len(intervals):
                return 0
            res = max_keep(i + 1, prev_end)
            if intervals[i][0] >= prev_end:
                res = max(res, 1 + max_keep(i + 1, intervals[i][1]))
            return res
        kept = max_keep(0, -10**9)
        return len(intervals) - kept
