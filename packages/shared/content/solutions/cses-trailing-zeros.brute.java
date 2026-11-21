class Solution {
    public int trailingZeros(int n) {
        int count = 0;
        for (long p = 5; p <= n; p *= 5) {
            count += (int) (n / p);
        }
        return count;
    }
}
