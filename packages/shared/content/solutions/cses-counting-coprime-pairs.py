# verify: skip-stress
from typing import List

class Solution:
    def countingCoprimePairs(self, arr: List[int]) -> int:
        max_val = max(arr) if arr else 0
        if max_val < 1:
            return 0
        mu = [0] * (max_val + 1)
        primes = []
        is_prime = [True] * (max_val + 1)
        mu[1] = 1
        for i in range(2, max_val + 1):
            if is_prime[i]:
                primes.append(i)
                mu[i] = -1
            for p in primes:
                if i * p > max_val:
                    break
                is_prime[i * p] = False
                if i % p == 0:
                    mu[i * p] = 0
                    break
                else:
                    mu[i * p] = -mu[i]
        freq = [0] * (max_val + 1)
        for x in arr:
            freq[x] += 1
        total_coprime = 0
        for d in range(1, max_val + 1):
            if mu[d] == 0:
                continue
            cnt = sum(freq[mult] for mult in range(d, max_val + 1, d))
            pairs = cnt * (cnt - 1) // 2
            total_coprime += mu[d] * pairs
        return total_coprime