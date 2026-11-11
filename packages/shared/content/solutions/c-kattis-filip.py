class Solution:
    def reverseAndCompare(self, a: int, b: int) -> int:
        def rev(x: int) -> int:
            return int(str(x)[::-1])
        return max(rev(a), rev(b))
