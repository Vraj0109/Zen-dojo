import java.util.*;

class Solution {
    public boolean buildingTeams(int n, int[][] friendships) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i <= n; i++) adj.add(new ArrayList<>());
        for (int[] f : friendships) {
            adj.get(f[0]).add(f[1]);
            adj.get(f[1]).add(f[0]);
        }
        int[] color = new int[n + 1];
        Deque<Integer> q = new ArrayDeque<>();
        for (int i = 1; i <= n; i++) {
            if (color[i] != 0) continue;
            color[i] = 1;
            q.add(i);
            while (!q.isEmpty()) {
                int u = q.poll();
                for (int v : adj.get(u)) {
                    if (color[v] == 0) {
                        color[v] = 3 - color[u];
                        q.add(v);
                    } else if (color[v] == color[u]) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
}
