class Solution {
    public int[] singleNumber(int[] nums) {
        long x = 0;
        for (int v : nums) x ^= v;
        long bit = x & -x;
        int a = 0, b = 0;
        for (int v : nums) {
            if ((v & bit) != 0) a ^= v;
            else b ^= v;
        }
        return new int[]{a, b};
    }
}