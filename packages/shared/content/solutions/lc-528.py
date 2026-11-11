import bisect
import random
from typing import List

class Solution:
    def __init__(self, w: List[int]):
        self.prefix = []
        s = 0
        for x in w:
            s += x
            self.prefix.append(s)

    def pickIndex(self) -> int:
        val = random.randint(1, self.prefix[-1])
        return bisect.bisect_left(self.prefix, val)
