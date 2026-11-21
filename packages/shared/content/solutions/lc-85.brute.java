import java.util.*;

class Solution {
    public int maximalRectangle(String[][] matrix) {
        if (matrix.length == 0 || matrix[0].length == 0) return 0;
        int m = matrix.length, n = matrix[0].length;
        int maxArea = 0;

        for (int r1 = 0; r1 < m; r1++) {
            for (int c1 = 0; c1 < n; c1++) {
                if (!"1".equals(matrix[r1][c1])) continue;
                for (int r2 = r1; r2 < m; r2++) {
                    for (int c2 = c1; c2 < n; c2++) {
                        boolean allOnes = true;
                        for (int r = r1; r <= r2 && allOnes; r++) {
                            for (int c = c1; c <= c2; c++) {
                                if (!"1".equals(matrix[r][c])) {
                                    allOnes = false;
                                    break;
                                }
                            }
                        }
                        if (allOnes) {
                            maxArea = Math.max(maxArea, (r2 - r1 + 1) * (c2 - c1 + 1));
                        }
                    }
                }
            }
        }
        return maxArea;
    }
}
