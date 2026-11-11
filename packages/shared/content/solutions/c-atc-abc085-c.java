class Solution {
    public int otoshidamaWays(int n, int y) {
        int count = 0;
        for (int a = 0; a <= n; a++) {
            for (int b = 0; a + b <= n; b++) {
                int c = n - a - b;
                if (10000L * a + 5000L * b + 1000L * c == y) count++;
            }
        }
        return count;
    }
}
