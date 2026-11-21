class Solution {
    public int[] sortColors(int[] nums) {
        int[] cnt = new int[3];
        for (int x : nums) cnt[x]++;
        int idx = 0;
        for (int v = 0; v < 3; v++) {
            while (cnt[v] > 0) {
                nums[idx++] = v;
                cnt[v]--;
            }
        }
        return nums;
    }
}
