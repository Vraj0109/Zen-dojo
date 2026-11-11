import java.util.Arrays;
import java.util.TreeSet;

class Solution {
    private static class Point implements Comparable<Point> {
        long x, y;
        int id;
        Point(long x, long y, int id) {
            this.x = x;
            this.y = y;
            this.id = id;
        }
        @Override
        public int compareTo(Point o) {
            if (this.y != o.y) return Long.compare(this.y, o.y);
            if (this.x != o.x) return Long.compare(this.x, o.x);
            return Integer.compare(this.id, o.id);
        }
    }

    private long distSq(Point a, Point b) {
        long dx = a.x - b.x;
        long dy = a.y - b.y;
        return dx * dx + dy * dy;
    }

    public long minimumEuclideanDistance(int[][] points) {
        int n = points.length;
        Point[] pts = new Point[n];
        for (int i = 0; i < n; i++) {
            pts[i] = new Point(points[i][0], points[i][1], i);
        }
        Arrays.sort(pts, (a, b) -> {
            if (a.x != b.x) return Long.compare(a.x, b.x);
            return Long.compare(a.y, b.y);
        });

        for (int i = 0; i < n - 1; i++) {
            if (pts[i].x == pts[i + 1].x && pts[i].y == pts[i + 1].y) return 0;
        }

        long d = distSq(pts[0], pts[1]);
        TreeSet<Point> active = new TreeSet<>();

        int left = 0;
        for (int i = 0; i < n; i++) {
            long limitX = (long)Math.ceil(Math.sqrt(d));
            while (left < i && pts[i].x - pts[left].x >= limitX) {
                active.remove(pts[left]);
                left++;
            }

            long limitY = (long)Math.ceil(Math.sqrt(d));
            Point lowerPt = new Point(Long.MIN_VALUE, pts[i].y - limitY, -1);
            Point upperPt = new Point(Long.MAX_VALUE, pts[i].y + limitY, Integer.MAX_VALUE);

            for (Point pt : active.subSet(lowerPt, true, upperPt, true)) {
                d = Math.min(d, distSq(pts[i], pt));
            }

            active.add(pts[i]);
        }

        return d;
    }
}
