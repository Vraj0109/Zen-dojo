class Solution:
    def countPrimes(self, n: int) -> int:
        def is_prime(x: int) -> bool:
            if x < 2:
                return False
            d = 2
            while d * d <= x:
                if x % d == 0:
                    return False
                d += 1
            return True

        count = 0
        for i in range(2, n):
            if is_prime(i):
                count += 1
        return count
