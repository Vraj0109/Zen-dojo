# verify: skip-stress
from typing import List

class Solution:
    def superPow(self, a: int, b: List[int]) -> int:
        def pw(base, e):
            r = 1
            base %= 1337
            while e > 0:
                if e & 1:
                    r = r * base % 1337
                base = base * base % 1337
                e >>= 1
            return r
        result = 1
        for d in b:
            result = pw(result, 10) * pw(a, d) % 1337
        return result