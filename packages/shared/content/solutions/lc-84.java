import java.util.*;

class Solution {
    public int largestRectangleArea(int[] heights) {
        int best = 0;
        Deque<Integer> st = new ArrayDeque<>();
        int n = heights.length;
        for (int i = 0; i <= n; i++) {
            int h = (i == n) ? 0 : heights[i];
            while (!st.isEmpty() && heights[st.peek()] > h) {
                int height = heights[st.pop()];
                int left = st.isEmpty() ? 0 : st.peek() + 1;
                best = Math.max(best, height * (i - left));
            }
            st.push(i);
        }
        return best;
    }
}