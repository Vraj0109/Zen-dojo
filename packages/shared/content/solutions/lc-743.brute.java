import java.util.*;

class Solution {
    private void dfs(int u, int currentDist, int[] dist, List<List<int[]>> g) {
        if (currentDist >= dist[u]) return;
        dist[u] = currentDist;
        for (int[] edge : g.get(u)) {
            int v = edge[0];
            int w = edge[1];
            dfs(v, currentDist + w, dist, g);
        }
    }

    public int networkDelayTime(int[][] times, int n, int k) {
        List<List<int[]>> g = new ArrayList<>();
        for (int i = 0; i <= n; i++) {
            g.add(new ArrayList<>());
        }
        for (int[] t : times) {
            g.get(t[0]).add(new int[]{t[1], t[2]});
        }
        int[] dist = new int[n + 1];
        Arrays.fill(dist, Integer.MAX_VALUE);
        dfs(k, 0, dist, g);
        int ans = 0;
        for (int i = 1; i <= n; i++) {
            if (dist[i] == Integer.MAX_VALUE) return -1;
            ans = Math.max(ans, dist[i]);
        }
        return ans;
    }
}
