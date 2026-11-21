from typing import List

class Solution:
    def shiftOnly(self, a: List[int]) -> int:
        ops = 0
        while True:
            for x in a:
                if x % 2 != 0:
                    return ops
            a = [x // 2 for x in a]
            ops += 1
