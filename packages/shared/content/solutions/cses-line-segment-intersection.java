class Solution {
    private int sign(long v) {
        if (v > 0) return 1;
        if (v < 0) return -1;
        return 0;
    }

    private int cross(long ax, long ay, long bx, long by, long cx, long cy) {
        long cp = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
        return sign(cp);
    }

    private boolean onSegment(long ax, long ay, long bx, long by, long px, long py) {
        return px >= Math.min(ax, bx) && px <= Math.max(ax, bx) &&
               py >= Math.min(ay, by) && py <= Math.max(ay, by);
    }

    public String[] lineSegmentIntersection(int[][] queries) {
        String[] ans = new String[queries.length];
        for (int i = 0; i < queries.length; i++) {
            int[] q = queries[i];
            long x1 = q[0], y1 = q[1], x2 = q[2], y2 = q[3];
            long x3 = q[4], y3 = q[5], x4 = q[6], y4 = q[7];
            int o1 = cross(x1, y1, x2, y2, x3, y3);
            int o2 = cross(x1, y1, x2, y2, x4, y4);
            int o3 = cross(x3, y3, x4, y4, x1, y1);
            int o4 = cross(x3, y3, x4, y4, x2, y2);

            if (o1 != o2 && o3 != o4) {
                ans[i] = "YES";
            } else if (o1 == 0 && onSegment(x1, y1, x2, y2, x3, y3)) {
                ans[i] = "YES";
            } else if (o2 == 0 && onSegment(x1, y1, x2, y2, x4, y4)) {
                ans[i] = "YES";
            } else if (o3 == 0 && onSegment(x3, y3, x4, y4, x1, y1)) {
                ans[i] = "YES";
            } else if (o4 == 0 && onSegment(x3, y3, x4, y4, x2, y2)) {
                ans[i] = "YES";
            } else {
                ans[i] = "NO";
            }
        }
        return ans;
    }
}
