class Solution {
    public boolean canSplitWatermelon(int w) {
        for (int w1 = 1; w1 < w; w1++) {
            int w2 = w - w1;
            if (w1 % 2 == 0 && w2 % 2 == 0) {
                return true;
            }
        }
        return false;
    }
}
