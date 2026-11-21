from typing import List
from collections import Counter

class Solution:
    def topKFrequent(self, nums: List[int], k: int) -> List[int]:
        counts = Counter(nums)
        pairs = sorted(counts.items(), key=lambda x: x[1], reverse=True)
        return [p[0] for p in pairs[:k]]
