import java.util.*;

class Solution {
    private int[] parent;

    private int findRoot(int i) {
        if (parent[i] == i) return i;
        return parent[i] = findRoot(parent[i]);
    }

    private boolean unite(int i, int j) {
        int r1 = findRoot(i), r2 = findRoot(j);
        if (r1 == r2) return false;
        parent[r1] = r2;
        return true;
    }

    public int[] numIslands2(int m, int n, int[][] positions) {
        parent = new int[m * n];
        Arrays.fill(parent, -1);
        int count = 0;
        int[] res = new int[positions.length];
        int[] dr = {1, -1, 0, 0};
        int[] dc = {0, 0, 1, -1};

        for (int pIdx = 0; pIdx < positions.length; pIdx++) {
            int r = positions[pIdx][0], c = positions[pIdx][1];
            int idx = r * n + c;
            if (parent[idx] != -1) {
                res[pIdx] = count;
                continue;
            }
            parent[idx] = idx;
            count++;
            for (int i = 0; i < 4; i++) {
                int nr = r + dr[i], nc = c + dc[i];
                if (nr < 0 || nr >= m || nc < 0 || nc >= n) continue;
                int nidx = nr * n + nc;
                if (parent[nidx] != -1) {
                    if (unite(idx, nidx)) count--;
                }
            }
            res[pIdx] = count;
        }
        return res;
    }
}
