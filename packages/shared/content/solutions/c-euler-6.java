class Solution {
    public long sumSquareDifference(int n) {
        long s = (long) n * (n + 1) / 2;
        long q = (long) n * (n + 1) * (2L * n + 1) / 6;
        return s * s - q;
    }
}
