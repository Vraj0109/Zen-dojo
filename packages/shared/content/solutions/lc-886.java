import java.util.*;

class Solution {
    public boolean possibleBipartition(int n, int[][] dislikes) {
        List<Integer>[] g = new List[n + 1];
        for (int i = 0; i <= n; i++) g[i] = new ArrayList<>();
        for (int[] d : dislikes) {
            g[d[0]].add(d[1]);
            g[d[1]].add(d[0]);
        }
        int[] color = new int[n + 1];
        Arrays.fill(color, -1);
        for (int s = 1; s <= n; s++) {
            if (color[s] != -1) continue;
            color[s] = 0;
            Queue<Integer> q = new ArrayDeque<>();
            q.offer(s);
            while (!q.isEmpty()) {
                int u = q.poll();
                for (int v : g[u]) {
                    if (color[v] == -1) {
                        color[v] = color[u] ^ 1;
                        q.offer(v);
                    } else if (color[v] == color[u]) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
}