from typing import List

class Solution:
    def weirdAlgorithm(self, n: int) -> List[int]:
        out = [n]
        x = n
        while x != 1:
            x = x // 2 if x % 2 == 0 else 3 * x + 1
            out.append(x)
        return out
