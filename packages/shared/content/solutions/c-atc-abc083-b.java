class Solution {
    public long someSums(int n, int a, int b) {
        long total = 0;
        for (int i = 1; i <= n; i++) {
            int s = 0;
            for (int x = i; x > 0; x /= 10) {
                s += x % 10;
            }
            if (s >= a && s <= b) total += i;
        }
        return total;
    }
}
