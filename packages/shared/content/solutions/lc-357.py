# verify: skip-stress
class Solution:
    def countNumbersWithUniqueDigits(self, n: int) -> int:
        if n == 0:
            return 1
        total = 10
        cur = 9
        avail = 9
        for k in range(2, min(n, 10) + 1):
            cur *= avail
            avail -= 1
            total += cur
        return total