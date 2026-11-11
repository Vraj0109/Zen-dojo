# verify: skip-stress
from typing import List
import bisect

class Solution:
    def lengthOfLIS(self, nums: List[int]) -> int:
        tails = []
        for x in nums:
            it = bisect.bisect_left(tails, x)
            if it == len(tails):
                tails.append(x)
            else:
                tails[it] = x
        return len(tails)