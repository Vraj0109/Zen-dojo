class Solution:
    def wrongSubtraction(self, n: int, k: int) -> int:
        for _ in range(k):
            if n % 10 == 0:
                n //= 10
            else:
                n -= 1
        return n
