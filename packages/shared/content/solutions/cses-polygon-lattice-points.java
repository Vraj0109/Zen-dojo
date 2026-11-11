class Solution {
    private long gcd(long a, long b) {
        while (b != 0) {
            long t = b;
            b = a % b;
            a = t;
        }
        return a;
    }

    public long[] polygonLatticePoints(int[][] polygon) {
        int n = polygon.length;
        long doubleArea = 0;
        long boundary = 0;
        for (int i = 0; i < n; i++) {
            int j = (i + 1) % n;
            long xi = polygon[i][0], yi = polygon[i][1];
            long xj = polygon[j][0], yj = polygon[j][1];
            doubleArea += xi * yj - xj * yi;
            boundary += gcd(Math.abs(xj - xi), Math.abs(yj - yi));
        }
        doubleArea = Math.abs(doubleArea);
        long inside = (doubleArea - boundary + 2) / 2;
        return new long[]{inside, boundary};
    }
}
