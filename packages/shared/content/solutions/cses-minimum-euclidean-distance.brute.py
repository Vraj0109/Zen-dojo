class Solution:
    def minimumEuclideanDistance(self, points: list[list[int]]) -> int:
        n = len(points)
        min_d = float('inf')
        for i in range(n):
            x1, y1 = points[i]
            for j in range(i + 1, n):
                x2, y2 = points[j]
                d = (x1 - x2) ** 2 + (y1 - y2) ** 2
                if d < min_d:
                    min_d = d
        return min_d
