import java.util.*;

class Solution {
    public int restaurantCustomers(int[][] customers) {
        int n = customers.length;
        int[][] events = new int[2 * n][2];
        for (int i = 0; i < n; i++) {
            events[2 * i] = new int[] {customers[i][0], 1};
            events[2 * i + 1] = new int[] {customers[i][1], -1};
        }
        Arrays.sort(events, (a, b) -> a[0] != b[0] ? Integer.compare(a[0], b[0]) : Integer.compare(a[1], b[1]));
        int cur = 0, best = 0;
        for (int[] e : events) {
            cur += e[1];
            best = Math.max(best, cur);
        }
        return best;
    }
}
