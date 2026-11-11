import math
from typing import List

class Solution:
    def polygonLatticePoints(self, polygon: List[List[int]]) -> List[int]:
        n = len(polygon)
        double_area = 0
        boundary = 0
        for i in range(n):
            j = (i + 1) % n
            xi, yi = polygon[i]
            xj, yj = polygon[j]
            double_area += xi * yj - xj * yi
            boundary += math.gcd(abs(xj - xi), abs(yj - yi))
        double_area = abs(double_area)
        inside = (double_area - boundary + 2) // 2
        return [inside, boundary]
