class Solution {
    public int maxArea(int[] height) {
        int n = height.length;
        int best = 0;
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                int area = (j - i) * Math.min(height[i], height[j]);
                best = Math.max(best, area);
            }
        }
        return best;
    }
}
