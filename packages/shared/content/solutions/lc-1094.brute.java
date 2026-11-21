class Solution {
    public boolean carPooling(int[][] trips, int capacity) {
        int[] road = new int[1001];
        for (int[] trip : trips) {
            int num = trip[0], from = trip[1], to = trip[2];
            for (int km = from; km < to; km++) {
                road[km] += num;
                if (road[km] > capacity) return false;
            }
        }
        return true;
    }
}
