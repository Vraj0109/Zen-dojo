# verify: skip-stress
from typing import List

class Solution:
    def nimGameI(self, heaps: List[int]) -> str:
        xor_sum = 0
        for x in heaps:
            xor_sum ^= x
        return "first" if xor_sum != 0 else "second"