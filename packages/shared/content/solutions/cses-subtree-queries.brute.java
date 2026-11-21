import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.List;
import java.util.Queue;

class Solution {
    public long[] subtreeQueries(int[] values, int[][] edges, int[][] queries) {
        int n = values.length;
        List<List<Integer>> adj = new ArrayList<>(n + 1);
        for (int i = 0; i <= n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) {
            adj.get(e[0]).add(e[1]);
            adj.get(e[1]).add(e[0]);
        }
        List<List<Integer>> children = new ArrayList<>(n + 1);
        for (int i = 0; i <= n; i++) children.add(new ArrayList<>());
        int[] par = new int[n + 1];
        Queue<Integer> bfs = new ArrayDeque<>();
        bfs.add(1);
        while (!bfs.isEmpty()) {
            int u = bfs.poll();
            for (int v : adj.get(u)) {
                if (v == par[u]) continue;
                par[v] = u;
                children.get(u).add(v);
                bfs.add(v);
            }
        }
        long[] val = new long[n + 1];
        for (int i = 0; i < n; i++) val[i + 1] = values[i];
        List<Long> ansList = new ArrayList<>();
        for (int[] q : queries) {
            if (q[0] == 1) {
                int s = q[1];
                long x = q[2];
                val[s] = x;
            } else {
                int s = q[1];
                long sum = 0;
                Queue<Integer> qu = new ArrayDeque<>();
                qu.add(s);
                while (!qu.isEmpty()) {
                    int u = qu.poll();
                    sum += val[u];
                    for (int v : children.get(u)) {
                        qu.add(v);
                    }
                }
                ansList.add(sum);
            }
        }
        long[] ans = new long[ansList.size()];
        for (int i = 0; i < ansList.size(); i++) ans[i] = ansList.get(i);
        return ans;
    }
}
