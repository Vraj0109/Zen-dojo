class Solution {
    public int fenceStart(int[] h, int k) {
        int n = h.length;
        int bestSum = Integer.MAX_VALUE;
        int bestIdx = 1;
        for (int i = 0; i <= n - k; i++) {
            int currentSum = 0;
            for (int j = 0; j < k; j++) {
                currentSum += h[i + j];
            }
            if (currentSum < bestSum) {
                bestSum = currentSum;
                bestIdx = i + 1;
            }
        }
        return bestIdx;
    }
}
