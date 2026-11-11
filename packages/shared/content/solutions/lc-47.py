# verify: skip-stress
from typing import List

class Solution:
    def permuteUnique(self, nums: List[int]) -> List[List[int]]:
        nums.sort()
        out = []
        cur = []
        used = [False] * len(nums)
        def go():
            if len(cur) == len(nums):
                out.append(list(cur))
                return
            for i in range(len(nums)):
                if used[i]:
                    continue
                if i > 0 and nums[i] == nums[i - 1] and not used[i - 1]:
                    continue
                used[i] = True
                cur.append(nums[i])
                go()
                cur.pop()
                used[i] = False
        go()
        return out