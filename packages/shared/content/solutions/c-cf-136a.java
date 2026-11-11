class Solution {
    public int[] reconstructGiftGivers(int[] p) {
        int n = p.length;
        int[] ans = new int[n];
        for (int i = 0; i < n; i++) {
            ans[p[i] - 1] = i + 1;
        }
        return ans;
    }
}
