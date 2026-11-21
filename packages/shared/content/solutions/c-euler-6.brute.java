class Solution {
    public long sumSquareDifference(int n) {
        long sum = 0;
        long sum_sq = 0;
        for (int i = 1; i <= n; i++) {
            sum += i;
            sum_sq += (long) i * i;
        }
        return sum * sum - sum_sq;
    }
}
