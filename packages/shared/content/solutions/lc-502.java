import java.util.*;

class Solution {
    public int findMaximizedCapital(int k, int w, int[] profits, int[] capital) {
        int n = profits.length;
        int[][] proj = new int[n][2];
        for (int i = 0; i < n; i++) {
            proj[i][0] = capital[i];
            proj[i][1] = profits[i];
        }
        Arrays.sort(proj, (a, b) -> Integer.compare(a[0], b[0]));
        PriorityQueue<Integer> pq = new PriorityQueue<>(Collections.reverseOrder());
        long money = w;
        int idx = 0;
        for (int round = 0; round < k; round++) {
            while (idx < n && proj[idx][0] <= money) {
                pq.offer(proj[idx++][1]);
            }
            if (pq.isEmpty()) break;
            money += pq.poll();
        }
        return (int) Math.min(money, (long) Integer.MAX_VALUE);
    }
}