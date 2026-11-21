class Solution {
    public int largestRectangleArea(int[] heights) {
        int n = heights.length;
        int best = 0;
        for (int i = 0; i < n; i++) {
            int left = i;
            while (left >= 0 && heights[left] >= heights[i]) left--;
            int right = i;
            while (right < n && heights[right] >= heights[i]) right++;
            int width = right - left - 1;
            best = Math.max(best, heights[i] * width);
        }
        return best;
    }
}
