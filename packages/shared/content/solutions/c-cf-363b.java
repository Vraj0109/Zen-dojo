class Solution {
    public int fenceStart(int[] h, int k) {
        long sum = 0;
        for (int i = 0; i < k; i++) sum += h[i];
        long best = sum;
        int start = 1;
        for (int i = k; i < h.length; i++) {
            sum += h[i] - h[i - k];
            if (sum < best) {
                best = sum;
                start = i - k + 2;
            }
        }
        return start;
    }
}
