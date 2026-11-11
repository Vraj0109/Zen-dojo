from typing import List

class Solution:
    def greedyTakahashi(self, a: int, b: int, k: int) -> List[int]:
        x = min(a, k)
        a -= x
        k -= x
        y = min(b, k)
        b -= y
        return [a, b]
