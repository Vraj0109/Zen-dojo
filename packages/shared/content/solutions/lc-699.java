import java.util.*;

class Solution {
    public int[] fallingSquares(int[][] positions) {
        List<int[]> placed = new ArrayList<>();
        int[] ans = new int[positions.length];
        int best = 0;
        for (int i = 0; i < positions.length; i++) {
            int[] p = positions[i];
            int l = p[0], r = p[0] + p[1];
            int base = 0;
            for (int[] q : placed) {
                if (l < q[1] && q[0] < r) {
                    base = Math.max(base, q[2]);
                }
            }
            int top = base + p[1];
            placed.add(new int[]{l, r, top});
            best = Math.max(best, top);
            ans[i] = best;
        }
        return ans;
    }
}