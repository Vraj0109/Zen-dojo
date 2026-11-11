class Solution {
    public int countNegativeTemperatures(int[] temps) {
        int count = 0;
        for (int t : temps) {
            if (t < 0) count++;
        }
        return count;
    }
}
