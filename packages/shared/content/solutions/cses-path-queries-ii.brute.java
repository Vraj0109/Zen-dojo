import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.List;
import java.util.Queue;

class Solution {
    public int[] pathQueriesII(int[] values, int[][] edges, int[][] queries) {
        int n = values.length;
        List<List<Integer>> adj = new ArrayList<>(n + 1);
        for (int i = 0; i <= n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) {
            adj.get(e[0]).add(e[1]);
            adj.get(e[1]).add(e[0]);
        }
        int[] val = new int[n + 1];
        for (int i = 0; i < n; i++) val[i + 1] = values[i];
        List<Integer> ansList = new ArrayList<>();
        int[] prev = new int[n + 1];
        boolean[] vis = new boolean[n + 1];
        for (int[] q : queries) {
            if (q[0] == 1) {
                int s = q[1];
                int x = q[2];
                val[s] = x;
            } else {
                int a = q[1], b = q[2];
                Queue<Integer> qu = new ArrayDeque<>();
                vis[a] = true;
                qu.add(a);
                while (!qu.isEmpty()) {
                    int u = qu.poll();
                    if (u == b) break;
                    for (int v : adj.get(u)) {
                        if (!vis[v]) {
                            vis[v] = true;
                            prev[v] = u;
                            qu.add(v);
                        }
                    }
                }
                int cur = b;
                int maxVal = val[b];
                while (cur != a) {
                    cur = prev[cur];
                    if (val[cur] > maxVal) maxVal = val[cur];
                }
                ansList.add(maxVal);

                // clean up vis
                qu.clear();
                qu.add(a);
                vis[a] = false;
                while (!qu.isEmpty()) {
                    int u = qu.poll();
                    for (int v : adj.get(u)) {
                        if (vis[v]) {
                            vis[v] = false;
                            qu.add(v);
                        }
                    }
                }
            }
        }
        int[] ans = new int[ansList.size()];
        for (int i = 0; i < ansList.size(); i++) ans[i] = ansList.get(i);
        return ans;
    }
}
