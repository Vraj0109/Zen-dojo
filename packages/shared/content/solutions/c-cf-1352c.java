class Solution {
    public long kthNotDivisible(int n, int k) {
        return (long)k + (k - 1) / (n - 1);
    }
}
