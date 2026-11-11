class Solution:
    def nthPrime(self, n: int) -> int:
        from math import log
        limit = 100
        if n >= 6:
            limit = int(n * (log(n) + log(log(n)))) + 10
        composite = [False] * (limit + 1)
        count = 0
        for i in range(2, limit + 1):
            if composite[i]:
                continue
            count += 1
            if count == n:
                return i
            j = i * i
            while j <= limit:
                composite[j] = True
                j += i
        return -1
