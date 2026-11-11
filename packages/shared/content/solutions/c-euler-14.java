class Solution {
    public int longestCollatzStart(int limit) {
        int[] len = new int[limit];
        len[1] = 1;
        int best = 1;
        for (int s = 2; s < limit; s++) {
            long x = s;
            int steps = 0;
            while (x >= s) {
                x = (x % 2 == 0) ? x / 2 : 3 * x + 1;
                steps++;
            }
            len[s] = steps + len[(int)x];
            if (len[s] > len[best]) best = s;
        }
        return best;
    }
}
