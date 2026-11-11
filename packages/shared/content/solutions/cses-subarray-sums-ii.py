from typing import List
from collections import defaultdict

class Solution:
    def subarraySumsII(self, arr: List[int], target: int) -> int:
        freq = defaultdict(int)
        freq[0] = 1
        pref = 0
        count = 0
        for x in arr:
            pref += x
            count += freq[pref - target]
            freq[pref] += 1
        return count
