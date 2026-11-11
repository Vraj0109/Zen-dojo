class Solution {
    public int[] spiralOrder(int[][] matrix) {
        int m = matrix.length, n = matrix[0].length;
        int[] out = new int[m * n];
        int idx = 0;
        int top = 0, bottom = m - 1, left = 0, right = n - 1;
        while (top <= bottom && left <= right) {
            for (int c = left; c <= right; c++) out[idx++] = matrix[top][c];
            top++;
            for (int r = top; r <= bottom; r++) out[idx++] = matrix[r][right];
            right--;
            if (top <= bottom) {
                for (int c = right; c >= left; c--) out[idx++] = matrix[bottom][c];
                bottom--;
            }
            if (left <= right) {
                for (int r = bottom; r >= top; r--) out[idx++] = matrix[r][left];
                left++;
            }
        }
        return out;
    }
}