class Solution:
    def quadraticPrimes(self, aMax: int, bMax: int) -> int:
        def is_prime(v: int) -> bool:
            if v < 2:
                return False
            d = 2
            while d * d <= v:
                if v % d == 0:
                    return False
                d += 1
            return True

        best_len = -1
        best_prod = 0
        for b in range(2, bMax + 1):
            if not is_prime(b):
                continue
            for a in range(-(aMax - 1), aMax):
                n = 0
                while is_prime(n * n + a * n + b):
                    n += 1
                prod = a * b
                if n > best_len or (n == best_len and prod > best_prod):
                    best_len = n
                    best_prod = prod
        return best_prod
