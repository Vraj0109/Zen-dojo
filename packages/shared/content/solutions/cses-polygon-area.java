class Solution {
    public long polygonArea(int[][] points) {
        int n = points.length;
        long sum = 0;
        for (int i = 0; i < n; i++) {
            int j = (i + 1) % n;
            long xi = points[i][0], yi = points[i][1];
            long xj = points[j][0], yj = points[j][1];
            sum += xi * yj - xj * yi;
        }
        return Math.abs(sum);
    }
}
