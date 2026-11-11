class Solution {
    public int coinWays(int a, int b, int c, int x) {
        int count = 0;
        for (int i = 0; i <= a; i++) {
            for (int j = 0; j <= b; j++) {
                for (int k = 0; k <= c; k++) {
                    if (500 * i + 100 * j + 50 * k == x) count++;
                }
            }
        }
        return count;
    }
}
