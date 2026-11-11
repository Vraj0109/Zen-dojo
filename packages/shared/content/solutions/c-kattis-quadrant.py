class Solution:
    def selectQuadrant(self, x: int, y: int) -> int:
        if x > 0 and y > 0:
            return 1
        if x < 0 and y > 0:
            return 2
        if x < 0 and y < 0:
            return 3
        return 4
