class Solution {
    public boolean carPooling(int[][] trips, int capacity) {
        int[] diff = new int[1002];
        for (int[] t : trips) {
            diff[t[1]] += t[0];
            diff[t[2]] -= t[0];
        }
        int load = 0;
        for (int d : diff) {
            load += d;
            if (load > capacity) return false;
        }
        return true;
    }
}