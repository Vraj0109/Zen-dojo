class Solution:
    def longestCycleDenominator(self, limit: int) -> int:
        best = -1
        bestD = 2
        for d in range(2, limit):
            m = d
            while m % 2 == 0:
                m //= 2
            while m % 5 == 0:
                m //= 5
            length = 0
            if m > 1:
                r = 10 % m
                length = 1
                while r != 1:
                    r = r * 10 % m
                    length += 1
            if length > best:
                best = length
                bestD = d
        return bestD
