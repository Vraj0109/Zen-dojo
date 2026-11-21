import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.List;
import java.util.Queue;

class Solution {
    public int[] subordinates(int n, int[] bosses) {
        List<List<Integer>> adj = new ArrayList<>(n + 1);
        for (int i = 0; i <= n; i++) adj.add(new ArrayList<>());
        for (int i = 0; i < n - 1; i++) {
            int emp = i + 2;
            int boss = bosses[i];
            adj.get(boss).add(emp);
        }
        int[] ans = new int[n];
        for (int i = 1; i <= n; i++) {
            int count = 0;
            Queue<Integer> q = new ArrayDeque<>();
            q.add(i);
            while (!q.isEmpty()) {
                int u = q.poll();
                for (int v : adj.get(u)) {
                    count++;
                    q.add(v);
                }
            }
            ans[i - 1] = count;
        }
        return ans;
    }
}
