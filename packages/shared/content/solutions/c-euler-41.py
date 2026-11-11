import itertools

class Solution:
    def pandigitalPrime(self, n: int) -> int:
        if n == 8 or n == 9:
            return 0

        def is_prime(v: int) -> bool:
            if v < 2:
                return False
            d = 2
            while d * d <= v:
                if v % d == 0:
                    return False
                d += 1
            return True

        digits = [str(d) for d in range(n, 0, -1)]
        for p in itertools.permutations(digits):
            v = int("".join(p))
            if is_prime(v):
                return v
        return 0
