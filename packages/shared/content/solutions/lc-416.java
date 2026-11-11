class Solution {
    public boolean canPartition(int[] nums) {
        int total = 0;
        for (int x : nums) total += x;
        if (total % 2 != 0) return false;
        int target = total / 2;
        boolean[] reach = new boolean[target + 1];
        reach[0] = true;
        for (int x : nums) {
            for (int s = target; s >= x; s--) {
                if (reach[s - x]) reach[s] = true;
            }
        }
        return reach[target];
    }
}