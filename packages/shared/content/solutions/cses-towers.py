from typing import List
import bisect

class Solution:
    def towers(self, cubes: List[int]) -> int:
        tops = []
        for c in cubes:
            idx = bisect.bisect_right(tops, c)
            if idx == len(tops):
                tops.append(c)
            else:
                tops[idx] = c
        return len(tops)
