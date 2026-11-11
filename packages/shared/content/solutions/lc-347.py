# verify: skip-stress
from typing import List
from collections import Counter

class Solution:
    def topKFrequent(self, nums: List[int], k: int) -> List[int]:
        count = Counter(nums)
        bucket = [[] for _ in range(len(nums) + 1)]
        for val, c in count.items():
            bucket[c].append(val)
        out = []
        for c in range(len(nums), 0, -1):
            for v in bucket[c]:
                if len(out) < k:
                    out.append(v)
        return out