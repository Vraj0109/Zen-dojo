class Solution {
    public long increasingArray(long[] x) {
        long moves = 0;
        for (int i = 1; i < x.length; i++) {
            if (x[i] < x[i - 1]) {
                moves += x[i - 1] - x[i];
                x[i] = x[i - 1];
            }
        }
        return moves;
    }
}
