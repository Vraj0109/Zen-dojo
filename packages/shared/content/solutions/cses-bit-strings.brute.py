class Solution:
    def bitStrings(self, n: int) -> int:
        res = 1
        mod = 1000000007
        for _ in range(n):
            res = (res * 2) % mod
        return res
