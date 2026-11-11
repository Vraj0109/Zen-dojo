# verify: skip-stress
from typing import List

class Solution:
    def findDuplicates(self, nums: List[int]) -> List[int]:
        out = []
        for x in nums:
            v = abs(x)
            if nums[v - 1] < 0:
                out.append(v)
            else:
                nums[v - 1] = -nums[v - 1]
        return out