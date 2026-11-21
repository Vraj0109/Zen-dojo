class Solution {
    public long stickLengths(int[] lengths) {
        long best = -1;
        for (int target : lengths) {
            long cost = 0;
            for (int x : lengths) {
                cost += Math.abs((long) x - target);
            }
            if (best == -1 || cost < best) {
                best = cost;
            }
        }
        return best;
    }
}
