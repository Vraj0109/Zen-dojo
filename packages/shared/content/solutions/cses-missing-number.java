class Solution {
    public int missingNumber(int n, int[] nums) {
        long total = (long) n * (n + 1) / 2;
        for (int x : nums) total -= x;
        return (int) total;
    }
}
