# verify: skip-stress
from typing import List
import bisect

class Solution:
    def maxEnvelopes(self, envelopes: List[List[int]]) -> int:
        envelopes.sort(key=lambda x: (x[0], -x[1]))
        tails = []
        for e in envelopes:
            it = bisect.bisect_left(tails, e[1])
            if it == len(tails):
                tails.append(e[1])
            else:
                tails[it] = e[1]
        return len(tails)