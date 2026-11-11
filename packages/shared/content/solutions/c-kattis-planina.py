class Solution:
    def planinaPoints(self, n: int) -> int:
        side = (1 << n) + 1
        return side * side
