class Solution {
    public int maxPoints(int[][] points) {
        int n = points.length;
        if (n <= 2) return n;

        int maxCollinear = 2;
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                int count = 2;
                long dx = points[j][0] - points[i][0];
                long dy = points[j][1] - points[i][1];

                for (int k = 0; k < n; k++) {
                    if (k == i || k == j) continue;
                    long dx2 = points[k][0] - points[i][0];
                    long dy2 = points[k][1] - points[i][1];
                    if (dy * dx2 == dx * dy2) {
                        count++;
                    }
                }
                maxCollinear = Math.max(maxCollinear, count);
            }
        }
        return maxCollinear;
    }
}
