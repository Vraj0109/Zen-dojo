class Solution {
    public int minEatingSpeed(int[] piles, int h) {
        int maxP = 0;
        for (int p : piles) maxP = Math.max(maxP, p);
        for (int k = 1; k <= maxP; k++) {
            long hours = 0;
            for (int p : piles) {
                hours += (p + k - 1) / k;
            }
            if (hours <= h) return k;
        }
        return maxP;
    }
}
