# verify: skip-stress
from typing import List

class Solution:
    def atMostNGivenDigitSet(self, digits: List[str], n: int) -> int:
        s = str(n)
        L = len(s)
        d = len(digits)
        total = 0
        p = 1
        for length in range(1, L):
            p *= d
            total += p
        for i in range(L):
            same = False
            below = 0
            for dg in digits:
                if dg[0] < s[i]:
                    below += 1
                elif dg[0] == s[i]:
                    same = True
            rest = d ** (L - i - 1)
            total += below * rest
            if not same:
                return total
        return total + 1