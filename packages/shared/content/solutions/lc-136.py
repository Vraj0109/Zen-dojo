# verify: skip-stress
from typing import List

class Solution:
    def singleNumber(self, nums: List[int]) -> int:
        r = 0
        for x in nums:
            r ^= x
        return r