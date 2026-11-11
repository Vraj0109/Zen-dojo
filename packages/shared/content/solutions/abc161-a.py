from typing import List

class Solution:
    def abcSwap(self, x: int, y: int, z: int) -> List[int]:
        x, y = y, x
        x, z = z, x
        return [x, y, z]
