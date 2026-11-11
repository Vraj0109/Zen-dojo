class Solution {
    public long potSum(int[] nums) {
        long total = 0;
        for (int x : nums) {
            long p = 1;
            int base = x / 10;
            int exp = x % 10;
            for (int i = 0; i < exp; i++) p *= base;
            total += p;
        }
        return total;
    }
}
