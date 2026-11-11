import java.util.*;

class Solution {
    public int[] calculateSpans(int[] prices) {
        int[] res = new int[prices.length];
        Deque<int[]> st = new ArrayDeque<>();
        for (int i = 0; i < prices.length; i++) {
            int p = prices[i];
            int span = 1;
            while (!st.isEmpty() && st.peek()[0] <= p) {
                span += st.pop()[1];
            }
            st.push(new int[] {p, span});
            res[i] = span;
        }
        return res;
    }
}
