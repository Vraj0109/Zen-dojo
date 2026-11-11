class Solution {
    private int[] bit;
    private int V = 20003;
    private void add(int i) {
        for (; i <= V; i += i & -i) bit[i]++;
    }
    private int sum(int i) {
        int s = 0;
        for (; i > 0; i -= i & -i) s += bit[i];
        return s;
    }
    public int[] countSmaller(int[] nums) {
        int OFF = 10001;
        bit = new int[V + 1];
        int[] ans = new int[nums.length];
        for (int i = nums.length - 1; i >= 0; i--) {
            int p = nums[i] + OFF;
            ans[i] = sum(p - 1);
            add(p);
        }
        return ans;
    }
}