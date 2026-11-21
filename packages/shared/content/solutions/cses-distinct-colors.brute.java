import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Queue;
import java.util.Set;

class Solution {
    public int[] distinctColors(int[] colors, int[][] edges) {
        int n = colors.length;
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
        int[] ans = new int[n];
        for (int i = 1; i <= n; i++) {
            Set<Integer> set = new HashSet<>();
            Queue<Integer> qu = new ArrayDeque<>();
            qu.add(i);
            while (!qu.isEmpty()) {
                int u = qu.poll();
                set.add(colors[u - 1]);
                for (int v : children.get(u)) {
                    qu.add(v);
                }
            }
            ans[i - 1] = set.size();
        }
        return ans;
    }
}
