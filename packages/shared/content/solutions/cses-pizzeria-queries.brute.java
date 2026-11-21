import java.util.ArrayList;
import java.util.List;

class Solution {
    public int[] pizzeriaQueries(int[] prices, int[][] queries) {
        int[] p = prices.clone();
        int n = p.length;
        List<Integer> ansList = new ArrayList<>();
        for (int[] q : queries) {
            if (q[0] == 1) {
                int k = q[1] - 1;
                int x = q[2];
                p[k] = x;
            } else {
                int k = q[1] - 1;
                int best = p[k];
                for (int i = 0; i < n; i++) {
                    int cost = p[i] + Math.abs(i - k);
                    if (cost < best) best = cost;
                }
                ansList.add(best);
            }
        }
        int[] ans = new int[ansList.size()];
        for (int i = 0; i < ansList.size(); i++) ans[i] = ansList.get(i);
        return ans;
    }
}
