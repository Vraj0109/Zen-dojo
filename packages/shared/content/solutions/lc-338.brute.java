class Solution {
    public int[] countBits(int n) {
        int[] ans = new int[n + 1];
        for (int i = 0; i <= n; i++) {
            int x = i, cnt = 0;
            while (x > 0) {
                cnt += (x & 1);
                x >>= 1;
            }
            ans[i] = cnt;
        }
        return ans;
    }
}
