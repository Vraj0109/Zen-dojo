import math

class Solution:
    def bestPerimeter(self, maxP: int) -> int:
        cnt = [0] * (maxP + 1)
        m = 2
        while 2 * m * (m + 1) <= maxP:
            for n in range(1, m):
                if 2 * m * (m + n) > maxP:
                    break
                if (m - n) % 2 == 1 and math.gcd(m, n) == 1:
                    q = 2 * m * (m + n)
                    for k in range(q, maxP + 1, q):
                        cnt[k] += 1
            m += 1
        best = 12
        for p in range(12, maxP + 1):
            if cnt[p] > cnt[best]:
                best = p
        return best
