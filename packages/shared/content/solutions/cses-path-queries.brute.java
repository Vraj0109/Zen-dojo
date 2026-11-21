import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.List;
import java.util.Queue;

class Solution {
    public long[] pathQueries(int[] values, int[][] edges, int[][] queries) {
        int n = values.length;
        List<List<Integer>> adj = new ArrayList<>(n + 1);
        for (int i = 0; i <= n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) {
            adj.get(e[0]).add(e[1]);
            adj.get(e[1]).add(e[0]);
        }
        int[] par = new int[n + 1];
        Queue<Integer> q = new ArrayDeque<>();
        q.add(1);
        while (!q.isEmpty()) {
            int u = q.poll();
            for (int v : adj.get(u)) {
                if (v == par[u]) continue;
                par[v] = u;
                q.add(v);
            }
        }
        long[] val = new long[n + 1];
        for (int i = 0; i < n; i++) val[i + 1] = values[i];
        List<Long> ansList = new ArrayList<>();
        for (int[] qry : queries) {
            if (qry[0] == 1) {
                int s = qry[1];
                long x = qry[2];
                val[s] = x;
            } else {
                int s = qry[1];
                long sum = 0;
                int cur = s;
                while (cur != 0) {
                    sum += val[cur];
                    cur = par[cur];
                }
                ansList.add(sum);
            }
        }
        long[] ans = new long[ansList.size()];
        for (int i = 0; i < ansList.size(); i++) ans[i] = ansList.get(i);
        return ans;
    }
}
