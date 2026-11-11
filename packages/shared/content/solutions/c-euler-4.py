class Solution:
    def largestPalindromeProduct(self, lo: int, hi: int) -> int:
        best = 0
        for a in range(hi, lo - 1, -1):
            if a * hi <= best:
                break
            for b in range(hi, a - 1, -1):
                p = a * b
                if p <= best:
                    break
                s = str(p)
                if s == s[::-1]:
                    best = p
                    break
        return best
