import java.util.*;

class Solution {
    public int[] subordinates(int n, int[] bosses) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i <= n; i++) adj.add(new ArrayList<>());
        for (int i = 0; i < n - 1; i++) {
            int emp = i + 2;
            int boss = bosses[i];
            adj.get(boss).add(emp);
        }
        int[] order = new int[n];
        int head = 0, tail = 0;
        order[tail++] = 1;
        while (head < tail) {
            int u = order[head++];
            for (int v : adj.get(u)) {
                order[tail++] = v;
            }
        }
        int[] sub = new int[n];
        for (int i = n - 1; i >= 0; i--) {
            int u = order[i];
            for (int v : adj.get(u)) {
                sub[u - 1] += 1 + sub[v - 1];
            }
        }
        return sub;
    }
}
