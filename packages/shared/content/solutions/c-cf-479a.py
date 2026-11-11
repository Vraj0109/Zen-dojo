class Solution:
    def maximizeExpression(self, a: int, b: int, c: int) -> int:
        return max(
            a + b + c,
            a * b * c,
            (a + b) * c,
            a * (b + c),
            a + b * c,
            a * b + c,
        )
