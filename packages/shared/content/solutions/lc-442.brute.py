from typing import List

class Solution:
    def findDuplicates(self, nums: List[int]) -> List[int]:
        seen = set()
        res = []
        for x in nums:
            if x in seen:
                res.append(x)
            else:
                seen.add(x)
        return res
