import java.util.*;

public class Solution {
    private static class Point {
        long x, y;
        int id;
        Point(long x, long y, int id) {
            this.x = x;
            this.y = y;
            this.id = id;
        }
    }

    private static long cross(Point o, Point a, Point b) {
        return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    }

    private static long distSq(Point a, Point b) {
        long dx = a.x - b.x;
        long dy = a.y - b.y;
        return dx * dx + dy * dy;
    }

    public int[][] convexHull(int[][] points) {
        int n = points.length;
        if (n <= 3) return points;

        Point[] pts = new Point[n];
        int start = 0;
        for (int i = 0; i < n; i++) {
            pts[i] = new Point(points[i][0], points[i][1], i);
            if (pts[i].x < pts[start].x || (pts[i].x == pts[start].x && pts[i].y < pts[start].y)) {
                start = i;
            }
        }

        List<Integer> hullIds = new ArrayList<>();
        boolean[] inHull = new boolean[n];
        int cur = start;

        while (true) {
            hullIds.add(cur);
            inHull[cur] = true;
            int nextPt = (cur + 1) % n;

            for (int i = 0; i < n; i++) {
                if (i == cur) continue;
                long c = cross(pts[cur], pts[nextPt], pts[i]);
                if (c < 0) {
                    nextPt = i;
                } else if (c == 0) {
                    if (distSq(pts[cur], pts[i]) > distSq(pts[cur], pts[nextPt])) {
                        nextPt = i;
                    }
                }
            }

            for (int i = 0; i < n; i++) {
                if (i == cur || i == nextPt) continue;
                if (cross(pts[cur], pts[nextPt], pts[i]) == 0) {
                    if (pts[i].x >= Math.min(pts[cur].x, pts[nextPt].x) && pts[i].x <= Math.max(pts[cur].x, pts[nextPt].x) &&
                        pts[i].y >= Math.min(pts[cur].y, pts[nextPt].y) && pts[i].y <= Math.max(pts[cur].y, pts[nextPt].y)) {
                        if (!inHull[i]) {
                            hullIds.add(i);
                            inHull[i] = true;
                        }
                    }
                }
            }

            cur = nextPt;
            if (cur == start) break;
            if (hullIds.size() > n * 2) break;
        }

        Set<String> seen = new HashSet<>();
        List<int[]> resList = new ArrayList<>();
        for (int id : hullIds) {
            String key = pts[id].x + "," + pts[id].y;
            if (seen.add(key)) {
                resList.add(new int[]{(int)pts[id].x, (int)pts[id].y});
            }
        }

        return resList.toArray(new int[0][]);
    }
}
