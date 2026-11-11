import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

class Solution {
    private static class Point {
        long x, y;
        Point(long x, long y) {
            this.x = x;
            this.y = y;
        }
    }

    private static long cross(Point o, Point a, Point b) {
        return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    }

    public int[][] convexHull(int[][] points) {
        int n = points.length;
        if (n <= 2) return points;

        Point[] pts = new Point[n];
        for (int i = 0; i < n; i++) pts[i] = new Point(points[i][0], points[i][1]);
        Arrays.sort(pts, (a, b) -> {
            if (a.x != b.x) return Long.compare(a.x, b.x);
            return Long.compare(a.y, b.y);
        });

        List<Point> lower = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            while (lower.size() >= 2 && cross(lower.get(lower.size() - 2), lower.get(lower.size() - 1), pts[i]) < 0) {
                lower.remove(lower.size() - 1);
            }
            lower.add(pts[i]);
        }

        List<Point> upper = new ArrayList<>();
        for (int i = n - 1; i >= 0; i--) {
            while (upper.size() >= 2 && cross(upper.get(upper.size() - 2), upper.get(upper.size() - 1), pts[i]) < 0) {
                upper.remove(upper.size() - 1);
            }
            upper.add(pts[i]);
        }

        List<Point> combined = new ArrayList<>(lower);
        combined.addAll(upper);

        combined.sort((a, b) -> {
            if (a.x != b.x) return Long.compare(a.x, b.x);
            return Long.compare(a.y, b.y);
        });

        List<Point> unique = new ArrayList<>();
        for (Point p : combined) {
            if (unique.isEmpty() || unique.get(unique.size() - 1).x != p.x || unique.get(unique.size() - 1).y != p.y) {
                unique.add(p);
            }
        }

        int[][] res = new int[unique.size()][2];
        for (int i = 0; i < unique.size(); i++) {
            res[i][0] = (int)unique.get(i).x;
            res[i][1] = (int)unique.get(i).y;
        }
        return res;
    }
}
