class Solution {
    public int teamProblems(int[][] rows) {
        int count = 0;
        for (int[] r : rows) {
            if (r[0] + r[1] + r[2] >= 2) count++;
        }
        return count;
    }
}
