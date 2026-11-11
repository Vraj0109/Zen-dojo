# verify: skip-stress
class Solution:
    def firstTriangleWithDivisors(self, minDivisors: int) -> int:
        def divisors(x: int) -> int:
            count = 1
            p = 2
            while p * p <= x:
                e = 0
                while x % p == 0:
                    x //= p
                    e += 1
                count *= e + 1
                p += 1
            if x > 1:
                count *= 2
            return count

        k = 1
        while True:
            a, b = k, k + 1
            if a % 2 == 0:
                a //= 2
            else:
                b //= 2
            if divisors(a) * divisors(b) > minDivisors:
                return k * (k + 1) // 2
            k += 1
