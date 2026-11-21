class Solution {
    public int missingNumber(int n, int[] nums) {
        boolean[] seen = new boolean[n + 1];
        for (int x : nums) {
            seen[x] = true;
        }
        for (int i = 1; i <= n; i++) {
            if (!seen[i]) return i;
        }
        return -1;
    }
}
