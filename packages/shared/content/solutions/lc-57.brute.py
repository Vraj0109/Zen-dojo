from typing import List

class Solution:
    def insert(self, intervals: List[List[int]], newInterval: List[int]) -> List[List[int]]:
        all_ivs = intervals + [newInterval]
        all_ivs.sort(key=lambda x: x[0])
        merged = []
        for iv in all_ivs:
            if not merged or merged[-1][1] < iv[0]:
                merged.append(list(iv))
            else:
                merged[-1][1] = max(merged[-1][1], iv[1])
        return merged
