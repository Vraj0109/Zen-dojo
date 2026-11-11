# verify: skip-stress
from typing import List

class Solution:
    def singleNumber(self, nums: List[int]) -> List[int]:
        x = 0
        for v in nums:
            x ^= v
        bit = x & -x
        a = b = 0
        for v in nums:
            if v & bit:
                a ^= v
            else:
                b ^= v
        return [a, b]