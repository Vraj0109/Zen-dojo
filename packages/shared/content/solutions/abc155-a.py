class Solution:
    def isPoor(self, a: int, b: int, c: int) -> str:
        eq = (a == b) + (b == c) + (a == c)
        return "Yes" if eq == 1 else "No"
