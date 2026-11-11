from typing import List

class Solution:
    def fenceWidth(self, heights: List[int], h: int) -> int:
        return sum(2 if x > h else 1 for x in heights)
