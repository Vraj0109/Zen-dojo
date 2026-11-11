class Solution {
    public int consecutiveDistinct(int k, int count) {
        int N = 5000000;
        byte[] om = new byte[N + 1];
        for (int p = 2; p <= N; p++) {
            if (om[p] == 0) {
                for (int m = p; m <= N; m += p) om[m]++;
            }
        }
        int run = 0;
        for (int x = 2; x <= N; x++) {
            if (om[x] == k) {
                run++;
                if (run == count) return x - count + 1;
            } else {
                run = 0;
            }
        }
        return -1;
    }
}
