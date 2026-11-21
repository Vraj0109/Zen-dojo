import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.List;
import java.util.Queue;

class Solution {
    public int[] countingPaths(int n, int[][] edges, int[][] paths) {
        List<List<Integer>> adj = new ArrayList<>(n + 1);
        for (int i = 0; i <= n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) {
            adj.get(e[0]).add(e[1]);
            adj.get(e[1]).add(e[0]);
        }
        int[] count = new int[n];
        int[] prev = new int[n + 1];
        boolean[] vis = new boolean[n + 1];
        for (int[] p : paths) {
            int a = p[0], b = p[1];
            Queue<Integer> q = new ArrayDeque<>();
            vis[a] = true;
            q.add(a);
            while (!q.isEmpty()) {
                int u = q.poll();
                if (u == b) break;
                for (int v : adj.get(u)) {
                    if (!vis[v]) {
                        vis[v] = true;
                        prev[v] = u;
                        q.add(v);
                    }
                }
            }
            int cur = b;
            while (cur != 0) {
                count[cur - 1]++;
                if (cur == a) break;
                cur = prev[cur];
            }
            // clean up
            q.clear();
            q.add(a);
            vis[a] = false;
            while (!q.isEmpty()) {
                int u = q.poll();
                for (int v : adj.get(u)) {
                    if (vis[v]) {
                        vis[v] = false;
                        q.add(v);
                    }
                }
            }
        }
        return count;
    }
}
