import java.util.*;

class Solution {
    public int minimumTime(int n, int[][] relations, int[] time) {
        List<Integer>[] g = new List[n + 1];
        for (int i = 0; i <= n; i++) g[i] = new ArrayList<>();
        int[] indeg = new int[n + 1];
        int[] start = new int[n + 1];
        for (int[] r : relations) {
            g[r[0]].add(r[1]);
            indeg[r[1]]++;
        }
        Queue<Integer> q = new ArrayDeque<>();
        for (int i = 1; i <= n; i++) {
            if (indeg[i] == 0) q.offer(i);
        }
        int best = 0;
        while (!q.isEmpty()) {
            int u = q.poll();
            int fin = start[u] + time[u - 1];
            best = Math.max(best, fin);
            for (int v : g[u]) {
                start[v] = Math.max(start[v], fin);
                if (--indeg[v] == 0) q.offer(v);
            }
        }
        return best;
    }
}