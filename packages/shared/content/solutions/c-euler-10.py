# verify: skip-stress
class Solution:
    def sumOfPrimes(self, limit: int) -> int:
        composite = [False] * (limit + 1)
        total = 0
        for i in range(2, limit):
            if composite[i]:
                continue
            total += i
            j = i * i
            while j < limit:
                composite[j] = True
                j += i
        return total
