# verify: skip-stress
from typing import List

class Solution:
    def removeDuplicates(self, nums: List[int]) -> List[int]:
        w = 0
        for x in nums:
            if w == 0 or nums[w - 1] != x:
                nums[w] = x
                w += 1
        return nums[:w]