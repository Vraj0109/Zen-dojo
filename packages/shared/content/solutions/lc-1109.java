class Solution {
    public int[] corpFlightBookings(int[][] bookings, int n) {
        int[] diff = new int[n + 2];
        int[] ans = new int[n];
        for (int[] b : bookings) {
            diff[b[0]] += b[2];
            diff[b[1] + 1] -= b[2];
        }
        int run = 0;
        for (int i = 1; i <= n; i++) {
            run += diff[i];
            ans[i - 1] = run;
        }
        return ans;
    }
}