import java.util.*;

class Solution {
    private void dfs(int u, int skippedEdge, List<List<int[]>> g, boolean[] visited) {
        visited[u] = true;
        for (int[] edge : g.get(u)) {
            int v = edge[0];
            int edgeId = edge[1];
            if (edgeId == skippedEdge) continue;
            if (!visited[v]) {
                dfs(v, skippedEdge, g, visited);
            }
        }
    }

    public int[][] criticalConnections(int n, int[][] connections) {
        int m = connections.length;
        List<List<int[]>> g = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            g.add(new ArrayList<>());
        }
        for (int i = 0; i < m; i++) {
            int u = connections[i][0];
            int v = connections[i][1];
            g.get(u).add(new int[]{v, i});
            g.get(v).add(new int[]{u, i});
        }

        List<int[]> bridges = new ArrayList<>();
        for (int i = 0; i < m; i++) {
            boolean[] visited = new boolean[n];
            dfs(0, i, g, visited);
            boolean connected = true;
            for (int j = 0; j < n; j++) {
                if (!visited[j]) {
                    connected = false;
                    break;
                }
            }
            if (!connected) {
                bridges.add(connections[i]);
            }
        }

        return bridges.toArray(new int[0][]);
    }
}
