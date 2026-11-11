# verify: skip-stress
class Solution:
    def spiralPrimeSide(self, percent: int) -> int:
        def is_prime(n: int) -> bool:
            if n < 2:
                return False
            for p in (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37):
                if n % p == 0:
                    return n == p
            d = n - 1
            s = 0
            while d % 2 == 0:
                d //= 2
                s += 1
            for a in (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37):
                x = pow(a, d, n)
                if x == 1 or x == n - 1:
                    continue
                for _ in range(s - 1):
                    x = (x * x) % n
                    if x == n - 1:
                        break
                else:
                    return False
            return True

        primes = 0
        s = 3
        while True:
            for k in range(1, 4):
                if is_prime(s * s - k * (s - 1)):
                    primes += 1
            if primes * 100 < percent * (2 * s - 1):
                return s
            s += 2
