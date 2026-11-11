from typing import List

class Solution:
    def polygonArea(self, points: List[List[int]]) -> int:
        n = len(points)
        s = 0
        for i in range(n):
            j = (i + 1) % n
            xi, yi = points[i]
            xj, yj = points[j]
            s += xi * yj - xj * yi
        return abs(s)
