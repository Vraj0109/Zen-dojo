class Solution:
    def cheapTravel(self, n: int, m: int, a: int, b: int) -> int:
        full, rest = divmod(n, m)
        return min(n * a, (full + 1) * b, full * b + rest * a)
