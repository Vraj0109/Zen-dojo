from typing import List

class Solution:
    def distinctValuesSubarrays(self, arr: List[int]) -> int:
        last_pos = {}
        total = 0
        l = 0
        for r, x in enumerate(arr):
            if x in last_pos and last_pos[x] >= l:
                l = last_pos[x] + 1
            last_pos[x] = r
            total += (r - l + 1)
        return total
