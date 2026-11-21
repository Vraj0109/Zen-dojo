class Solution:
    def convexHull(self, points: list[list[int]]) -> list[list[int]]:
        n = len(points)
        if n <= 3:
            return points

        pts = [(p[0], p[1], i) for i, p in enumerate(points)]
        start = min(range(n), key=lambda i: (pts[i][0], pts[i][1]))

        def cross(o, a, b):
            return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

        def dist_sq(a, b):
            return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2

        hull_ids = []
        in_hull = [False] * n
        cur = start

        while True:
            hull_ids.append(cur)
            in_hull[cur] = True
            next_pt = (cur + 1) % n

            for i in range(n):
                if i == cur:
                    continue
                c = cross(pts[cur], pts[next_pt], pts[i])
                if c < 0:
                    next_pt = i
                elif c == 0:
                    if dist_sq(pts[cur], pts[i]) > dist_sq(pts[cur], pts[next_pt]):
                        next_pt = i

            for i in range(n):
                if i == cur or i == next_pt:
                    continue
                if cross(pts[cur], pts[next_pt], pts[i]) == 0:
                    min_x, max_x = min(pts[cur][0], pts[next_pt][0]), max(pts[cur][0], pts[next_pt][0])
                    min_y, max_y = min(pts[cur][1], pts[next_pt][1]), max(pts[cur][1], pts[next_pt][1])
                    if min_x <= pts[i][0] <= max_x and min_y <= pts[i][1] <= max_y:
                        if not in_hull[i]:
                            hull_ids.append(i)
                            in_hull[i] = True

            cur = next_pt
            if cur == start:
                break
            if len(hull_ids) > n * 2:
                break

        seen = set()
        res = []
        for id in hull_ids:
            pt = [pts[id][0], pts[id][1]]
            key = (pt[0], pt[1])
            if key not in seen:
                seen.add(key)
                res.append(pt)
        return res
