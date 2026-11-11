from typing import List

class Solution:
    def shiftOnly(self, a: List[int]) -> int:
        best = 100
        for x in a:
            c = 0
            while x % 2 == 0:
                x //= 2
                c += 1
            best = min(best, c)
        return best
