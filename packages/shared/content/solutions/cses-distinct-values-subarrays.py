from typing import List

class Solution:
    def distinctValuesSubarrays(self, arr: List[int]) -> int:
        last_pos = {}
        total = 0
        l = 0
        for r, val in enumerate(arr):
            if val in last_pos and last_pos[val] >= l:
                l = last_pos[val] + 1
            last_pos[val] = r
            total += r - l + 1
        return total
