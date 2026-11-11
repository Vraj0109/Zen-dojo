# verify: skip-stress
from typing import List
from collections import defaultdict

class Solution:
    def subarraySum(self, nums: List[int], k: int) -> int:
        seen = defaultdict(int)
        seen[0] = 1
        prefix = 0
        total = 0
        for x in nums:
            prefix += x
            total += seen[prefix - k]
            seen[prefix] += 1
        return total