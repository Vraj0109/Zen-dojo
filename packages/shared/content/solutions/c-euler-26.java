class Solution {
    public int longestCycleDenominator(int limit) {
        int best = -1, bestD = 2;
        for (int d = 2; d < limit; d++) {
            int m = d;
            while (m % 2 == 0) m /= 2;
            while (m % 5 == 0) m /= 5;
            int len = 0;
            if (m > 1) {
                int r = 10 % m;
                len = 1;
                while (r != 1) {
                    r = r * 10 % m;
                    len++;
                }
            }
            if (len > best) {
                best = len;
                bestD = d;
            }
        }
        return bestD;
    }
}
