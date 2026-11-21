import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.List;
import java.util.Queue;

class Solution {
    public int findingACentroid(int n, int[][] edges) {
        List<List<Integer>> adj = new ArrayList<>(n + 1);
        for (int i = 0; i <= n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) {
            adj.get(e[0]).add(e[1]);
            adj.get(e[1]).add(e[0]);
        }
        boolean[] vis = new boolean[n + 1];
        for (int v = 1; v <= n; v++) {
            vis[v] = true;
            boolean ok = true;
            for (int start : adj.get(v)) {
                if (vis[start]) continue;
                int compSize = 0;
                Queue<Integer> q = new ArrayDeque<>();
                vis[start] = true;
                q.add(start);
                while (!q.isEmpty()) {
                    int u = q.poll();
                    compSize++;
                    for (int nxt : adj.get(u)) {
                        if (!vis[nxt]) {
                            vis[nxt] = true;
                            q.add(nxt);
                        }
                    }
                }
                if (compSize > n / 2) {
                    ok = false;
                    break;
                }
            }
            // cleanup vis
            for (int i = 1; i <= n; i++) vis[i] = false;
            if (ok) return v;
        }
        return -1;
    }
}
