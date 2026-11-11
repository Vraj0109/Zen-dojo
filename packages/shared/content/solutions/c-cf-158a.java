class Solution {
    public int nextRound(int[] scores, int k) {
        int t = scores[k - 1];
        int count = 0;
        for (int s : scores) {
            if (s >= t && s > 0) count++;
        }
        return count;
    }
}
