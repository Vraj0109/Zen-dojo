class Solution {
    public int restaurantCustomers(int[][] customers) {
        int maxOverlap = 0;
        for (int[] c1 : customers) {
            int arrival = c1[0];
            int count = 0;
            for (int[] c2 : customers) {
                if (c2[0] <= arrival && arrival <= c2[1]) {
                    count++;
                }
            }
            maxOverlap = Math.max(maxOverlap, count);
        }
        return maxOverlap;
    }
}
