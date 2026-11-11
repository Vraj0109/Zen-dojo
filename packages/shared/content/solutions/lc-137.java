class Solution {
    public int singleNumber(int[] nums) {
        int res = 0;
        for (int b = 0; b < 32; b++) {
            int cnt = 0;
            for (int x : nums) {
                cnt += (x >> b) & 1;
            }
            if (cnt % 3 != 0) res |= (1 << b);
        }
        return res;
    }
}