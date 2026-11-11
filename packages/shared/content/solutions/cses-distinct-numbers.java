import java.util.*;

class Solution {
    public int distinctNumbers(int[] arr) {
        if (arr.length == 0) return 0;
        Arrays.sort(arr);
        int ans = 1;
        for (int i = 1; i < arr.length; i++) {
            if (arr[i] != arr[i - 1]) ans++;
        }
        return ans;
    }
}
