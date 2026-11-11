from typing import List

class Solution:
    def productOrMinusOne(self, a: List[int]) -> int:
        LIM = 1000000000000000
        if 0 in a:
            return 0
        cur = 1
        for x in a:
            if cur > LIM // x:
                return -1
            cur *= x
        return cur
