class Solution {
    private boolean onSegment(long ax, long ay, long bx, long by, long px, long py) {
        long cp = (bx - ax) * (py - ay) - (by - ay) * (px - ax);
        if (cp != 0) return false;
        return px >= Math.min(ax, bx) && px <= Math.max(ax, bx) &&
               py >= Math.min(ay, by) && py <= Math.max(ay, by);
    }

    public String[] pointInPolygon(int[][] polygon, int[][] points) {
        int n = polygon.length;
        String[] ans = new String[points.length];

        for (int pIdx = 0; pIdx < points.length; pIdx++) {
            long px = points[pIdx][0], py = points[pIdx][1];
            boolean boundary = false;
            int crossings = 0;

            for (int i = 0; i < n; i++) {
                long ax = polygon[i][0], ay = polygon[i][1];
                long bx = polygon[(i + 1) % n][0], by = polygon[(i + 1) % n][1];

                if (onSegment(ax, ay, bx, by, px, py)) {
                    boundary = true;
                    break;
                }

                if (ay > by) {
                    long tx = ax; ax = bx; bx = tx;
                    long ty = ay; ay = by; by = ty;
                }
                if (ay <= py && py < by) {
                    long cp = (bx - ax) * (py - ay) - (by - ay) * (px - ax);
                    if (cp > 0) {
                        crossings++;
                    }
                }
            }

            if (boundary) {
                ans[pIdx] = "BOUNDARY";
            } else if (crossings % 2 == 1) {
                ans[pIdx] = "INSIDE";
            } else {
                ans[pIdx] = "OUTSIDE";
            }
        }
        return ans;
    }
}
