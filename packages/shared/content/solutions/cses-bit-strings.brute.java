class Solution {
    public int bitStrings(int n) {
        long res = 1;
        long mod = 1000000007;
        for (int i = 0; i < n; i++) {
            res = (res * 2) % mod;
        }
        return (int) res;
    }
}
