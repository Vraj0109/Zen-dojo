from typing import List

class Solution:
    def findZamkaMinMax(self, l: int, d: int, x: int) -> List[int]:
        def digit_sum(num: int) -> int:
            return sum(int(c) for c in str(num))

        n = -1
        m = -1
        for i in range(l, d + 1):
            if digit_sum(i) == x:
                n = i
                break
        for i in range(d, l - 1, -1):
            if digit_sum(i) == x:
                m = i
                break
        return [n, m]
