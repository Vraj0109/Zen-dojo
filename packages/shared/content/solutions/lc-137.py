# verify: skip-stress
from typing import List

class Solution:
    def singleNumber(self, nums: List[int]) -> int:
        res = 0
        for b in range(32):
            cnt = sum((x >> b) & 1 for x in nums)
            if cnt % 3:
                res |= (1 << b)
        if res >= (1 << 31):
            res -= (1 << 32)
        return res