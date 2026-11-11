class Solution {
    public int cheapTravel(int n, int m, int a, int b) {
        int full = n / m, rest = n % m;
        return Math.min(n * a, Math.min((full + 1) * b, full * b + rest * a));
    }
}
