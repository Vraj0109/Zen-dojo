class Solution {
    public int maxPathTriangle(int[][] triangle) {
        int n = triangle.length;
        int[] d = triangle[n - 1].clone();
        for (int i = n - 2; i >= 0; i--) {
            for (int j = 0; j <= i; j++) {
                d[j] = triangle[i][j] + Math.max(d[j], d[j + 1]);
            }
        }
        return d[0];
    }
}
