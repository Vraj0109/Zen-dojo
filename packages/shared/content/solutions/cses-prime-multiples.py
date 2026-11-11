# verify: skip-stress
from typing import List

class Solution:
    def primeMultiples(self, n: int, primes: List[int]) -> int:
        k = len(primes)
        ans = 0
        total_subsets = 1 << k
        for mask in range(1, total_subsets):
            bits = 0
            prod = 1
            overflow = False
            for i in range(k):
                if (mask >> i) & 1:
                    bits += 1
                    if primes[i] > n // prod:
                        overflow = True
                        break
                    prod *= primes[i]
            if overflow:
                continue
            count = n // prod
            if bits % 2 == 1:
                ans += count
            else:
                ans -= count
        return ans