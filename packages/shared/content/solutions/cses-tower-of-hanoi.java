import java.util.*;

class Solution {
    private List<int[]> out = new ArrayList<>();

    private void go(int n, int from, int to, int via) {
        if (n == 0) return;
        go(n - 1, from, via, to);
        out.add(new int[] {from, to});
        go(n - 1, via, to, from);
    }

    public int[][] towerOfHanoi(int n) {
        out.clear();
        go(n, 1, 3, 2);
        return out.toArray(new int[0][]);
    }
}
