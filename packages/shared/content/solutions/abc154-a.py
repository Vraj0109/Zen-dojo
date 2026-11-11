from typing import List

class Solution:
    def remainingBalls(self, s: str, t: str, a: int, b: int, u: str) -> List[int]:
        if u == s:
            a -= 1
        else:
            b -= 1
        return [a, b]
