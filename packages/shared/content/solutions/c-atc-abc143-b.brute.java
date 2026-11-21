class Solution {
    public int pairProductSum(int[] d) {
        int n = d.length;
        int total = 0;
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                total += d[i] * d[j];
            }
        }
        return total;
    }
}
