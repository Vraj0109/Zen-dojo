# verify: skip-stress
from typing import List

class Solution:
    def subsetsWithDup(self, nums: List[int]) -> List[List[int]]:
        nums.sort()
        out = []
        cur = []
        def go(start):
            out.append(list(cur))
            for i in range(start, len(nums)):
                if i > start and nums[i] == nums[i - 1]:
                    continue
                cur.append(nums[i])
                go(i + 1)
                cur.pop()
        go(0)
        return out