class Solution {
    private boolean canShip(int[] weights, int days, int cap) {
        int used = 1, load = 0;
        for (int w : weights) {
            if (load + w > cap) {
                used++;
                load = 0;
            }
            load += w;
        }
        return used <= days;
    }

    public int shipWithinDays(int[] weights, int days) {
        int lo = 0, hi = 0;
        for (int w : weights) {
            lo = Math.max(lo, w);
            hi += w;
        }
        for (int c = lo; c <= hi; c++) {
            if (canShip(weights, days, c)) return c;
        }
        return hi;
    }
}
