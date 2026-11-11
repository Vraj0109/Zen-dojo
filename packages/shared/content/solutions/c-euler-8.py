class Solution:
    def largestProduct(self, digits: str, k: int) -> int:
        best = 0
        for i in range(len(digits) - k + 1):
            p = 1
            for j in range(i, i + k):
                p *= int(digits[j])
            best = max(best, p)
        return best
