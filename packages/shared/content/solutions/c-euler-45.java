class Solution {
    private static boolean isPent(long x) {
        long d = 1 + 24 * x;
        long r = (long)Math.sqrt(d);
        while (r * r > d) r--;
        while ((r + 1) * (r + 1) <= d) r++;
        return r * r == d && (1 + r) % 6 == 0;
    }

    public long nextTriPentHex(long after) {
        for (long n = 1;; n++) {
            long h = n * (2 * n - 1);
            if (h > after && isPent(h)) return h;
        }
    }
}
