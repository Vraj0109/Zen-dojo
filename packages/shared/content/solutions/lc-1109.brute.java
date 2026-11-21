class Solution {
    public int[] corpFlightBookings(int[][] bookings, int n) {
        int[] ans = new int[n];
        for (int[] b : bookings) {
            int first = b[0], last = b[1], seats = b[2];
            for (int i = first - 1; i < last; i++) {
                ans[i] += seats;
            }
        }
        return ans;
    }
}
