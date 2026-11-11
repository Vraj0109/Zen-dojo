class Solution {
    public int calculateTotalDistance(int[][] logs) {
        int total = 0;
        int prev = 0;
        for (int[] log : logs) {
            int speed = log[0];
            int curr = log[1];
            total += speed * (curr - prev);
            prev = curr;
        }
        return total;
    }
}
