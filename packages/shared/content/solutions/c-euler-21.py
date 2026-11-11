class Solution:
    def amicableSum(self, limit: int) -> int:
        d = [0] * (limit + 1)
        for i in range(1, limit):
            for j in range(2 * i, limit, i):
                d[j] += i
        total = 0
        for a in range(1, limit):
            b = d[a]
            if b != a and b < limit and d[b] == a:
                total += a
        return total
