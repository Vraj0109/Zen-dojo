class Solution:
    def maxPoints(self, points: list[list[int]]) -> int:
        n = len(points)
        if n <= 2:
            return n

        max_collinear = 2
        for i in range(n):
            for j in range(i + 1, n):
                count = 2
                dx = points[j][0] - points[i][0]
                dy = points[j][1] - points[i][1]

                for k in range(n):
                    if k == i or k == j:
                        continue
                    dx2 = points[k][0] - points[i][0]
                    dy2 = points[k][1] - points[i][1]
                    if dy * dx2 == dx * dy2:
                        count += 1
                max_collinear = max(max_collinear, count)

        return max_collinear
