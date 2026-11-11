import java.util.*;

class Solution {
    public int[] nearestSmallerValues(int[] arr) {
        int n = arr.length;
        int[] ans = new int[n];
        Deque<int[]> st = new ArrayDeque<>();
        for (int i = 0; i < n; i++) {
            while (!st.isEmpty() && st.peek()[0] >= arr[i]) {
                st.pop();
            }
            if (st.isEmpty()) {
                ans[i] = 0;
            } else {
                ans[i] = st.peek()[1];
            }
            st.push(new int[] {arr[i], i + 1});
        }
        return ans;
    }
}
