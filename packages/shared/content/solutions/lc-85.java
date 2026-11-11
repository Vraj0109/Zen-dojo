import java.util.*;

class Solution {
    private int largestRectangleArea(int[] heights) {
        int[] h = new int[heights.length + 1];
        System.arraycopy(heights, 0, h, 0, heights.length);
        h[heights.length] = 0;
        Deque<Integer> st = new ArrayDeque<>();
        int maxArea = 0;
        for (int i = 0; i < h.length; i++) {
            while (!st.isEmpty() && h[st.peek()] >= h[i]) {
                int height = h[st.pop()];
                int width = st.isEmpty() ? i : i - st.peek() - 1;
                maxArea = Math.max(maxArea, height * width);
            }
            st.push(i);
        }
        return maxArea;
    }

    public int maximalRectangle(String[][] matrix) {
        if (matrix.length == 0 || matrix[0].length == 0) return 0;
        int cols = matrix[0].length;
        int[] heights = new int[cols];
        int maxArea = 0;
        for (String[] row : matrix) {
            for (int c = 0; c < cols; c++) {
                if (row[c] != null && !row[c].isEmpty() && row[c].charAt(0) == '1') heights[c]++;
                else heights[c] = 0;
            }
            maxArea = Math.max(maxArea, largestRectangleArea(heights));
        }
        return maxArea;
    }
}
