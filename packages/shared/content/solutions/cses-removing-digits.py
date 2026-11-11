class Solution:
    def removingDigits(self, n: int) -> int:
        steps = 0
        while n > 0:
            max_d = max(int(c) for c in str(n))
            n -= max_d
            steps += 1
        return steps
