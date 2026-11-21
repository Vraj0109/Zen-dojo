import java.util.*;

class Solution {
    public int[][] updateMatrix(int[][] mat) {
        int r = mat.length, c = mat[0].length;
        List<int[]> zeros = new ArrayList<>();
        for (int i = 0; i < r; i++) {
            for (int j = 0; j < c; j++) {
                if (mat[i][j] == 0) zeros.add(new int[]{i, j});
            }
        }
        int[][] res = new int[r][c];
        for (int i = 0; i < r; i++) {
            for (int j = 0; j < c; j++) {
                if (mat[i][j] == 1) {
                    int minDist = 1_000_000_000;
                    for (int[] z : zeros) {
                        minDist = Math.min(minDist, Math.abs(i - z[0]) + Math.abs(j - z[1]));
                    }
                    res[i][j] = minDist;
                }
            }
        }
        return res;
    }
}
