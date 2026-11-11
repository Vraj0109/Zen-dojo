# verify: skip-stress
from typing import List
from functools import cmp_to_key

class Solution:
    def largestNumber(self, nums: List[int]) -> str:
        s = [str(x) for x in nums]
        def cmp(a, b):
            if a + b > b + a:
                return -1
            elif a + b < b + a:
                return 1
            return 0
        s.sort(key=cmp_to_key(cmp))
        if s[0] == "0":
            return "0"
        return "".join(s)