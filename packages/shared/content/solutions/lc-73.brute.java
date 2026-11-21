class Solution {
    public int[][] setZeroes(int[][] matrix) {
        int r = matrix.length, c = matrix[0].length;
        int[][] copy = new int[r][c];
        for (int i = 0; i < r; i++) {
            for (int j = 0; j < c; j++) copy[i][j] = matrix[i][j];
        }
        for (int i = 0; i < r; i++) {
            for (int j = 0; j < c; j++) {
                if (matrix[i][j] == 0) {
                    for (int k = 0; k < c; k++) copy[i][k] = 0;
                    for (int k = 0; k < r; k++) copy[k][j] = 0;
                }
            }
        }
        return copy;
    }
}
