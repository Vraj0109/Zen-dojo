class Solution {
    public int maximalSquare(int[][] matrix) {
        int R = matrix.length;
        if (R == 0) return 0;
        int C = matrix[0].length;
        int maxSide = 0;

        for (int r = 0; r < R; r++) {
            for (int c = 0; c < C; c++) {
                if (matrix[r][c] == 1) {
                    maxSide = Math.max(maxSide, 1);
                    int maxK = Math.min(R - r, C - c);
                    for (int k = 2; k <= maxK; k++) {
                        boolean allOnes = true;
                        for (int i = 0; i < k; i++) {
                            for (int j = 0; j < k; j++) {
                                if (matrix[r + i][c + j] != 1) {
                                    allOnes = false;
                                    break;
                                }
                            }
                            if (!allOnes) break;
                        }
                        if (allOnes) maxSide = Math.max(maxSide, k);
                        else break;
                    }
                }
            }
        }
        return maxSide * maxSide;
    }
}
