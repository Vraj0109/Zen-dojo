class Solution:
    def someSums(self, n: int, a: int, b: int) -> int:
        total = 0
        for i in range(1, n + 1):
            s = 0
            x = i
            while x > 0:
                s += x % 10
                x //= 10
            if a <= s <= b:
                total += i
        return total
