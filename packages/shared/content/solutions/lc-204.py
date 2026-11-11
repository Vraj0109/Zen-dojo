# verify: skip-stress
class Solution:
    def countPrimes(self, n: int) -> int:
        if n < 3:
            return 0
        comp = [False] * n
        p = 2
        while p * p < n:
            if not comp[p]:
                for m in range(p * p, n, p):
                    comp[m] = True
            p += 1
        return sum(1 for i in range(2, n) if not comp[i])