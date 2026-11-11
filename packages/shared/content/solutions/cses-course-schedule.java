import java.util.*;

class Solution {
    public boolean courseSchedule(int n, int[][] requirements) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i <= n; i++) adj.add(new ArrayList<>());
        int[] indeg = new int[n + 1];
        for (int[] r : requirements) {
            adj.get(r[0]).add(r[1]);
            indeg[r[1]]++;
        }
        Deque<Integer> q = new ArrayDeque<>();
        for (int i = 1; i <= n; i++) {
            if (indeg[i] == 0) q.add(i);
        }
        int count = 0;
        while (!q.isEmpty()) {
            int u = q.poll();
            count++;
            for (int v : adj.get(u)) {
                if (--indeg[v] == 0) {
                    q.add(v);
                }
            }
        }
        return count == n;
    }
}
