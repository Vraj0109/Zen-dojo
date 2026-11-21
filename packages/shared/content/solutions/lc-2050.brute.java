import java.util.*;

class Solution {
    private int dfs(int u, List<List<Integer>> g, int[] time, int[] memo) {
        if (memo[u] != -1) return memo[u];
        int maxChild = 0;
        for (int v : g.get(u)) {
            maxChild = Math.max(maxChild, dfs(v, g, time, memo));
        }
        memo[u] = time[u - 1] + maxChild;
        return memo[u];
    }

    public int minimumTime(int n, int[][] relations, int[] time) {
        List<List<Integer>> g = new ArrayList<>();
        for (int i = 0; i <= n; i++) g.add(new ArrayList<>());
        for (int[] r : relations) {
            g.get(r[0]).add(r[1]);
        }
        int[] memo = new int[n + 1];
        Arrays.fill(memo, -1);
        int ans = 0;
        for (int i = 1; i <= n; i++) {
            ans = Math.max(ans, dfs(i, g, time, memo));
        }
        return ans;
    }
}
