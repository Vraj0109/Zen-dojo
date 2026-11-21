class Solution {
    public int sumSubarrayMins(int[] arr) {
        long MOD = 1_000_000_007L;
        int n = arr.length;
        long total = 0;
        for (int i = 0; i < n; i++) {
            int curMin = arr[i];
            for (int j = i; j < n; j++) {
                curMin = Math.min(curMin, arr[j]);
                total = (total + curMin) % MOD;
            }
        }
        return (int)total;
    }
}
