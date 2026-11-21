import java.util.*;

class Solution {
    public int[] countSmaller(int[] nums) {
        int n = nums.length;
        int[] ans = new int[n];
        for (int i = 0; i < n; i++) {
            int cnt = 0;
            for (int j = i + 1; j < n; j++) {
                if (nums[j] < nums[i]) cnt++;
            }
            ans[i] = cnt;
        }
        return ans;
    }
}
