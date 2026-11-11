import java.util.*;

class Solution {
    public int[] listRemovals(int[] arr, int[] positions) {
        int n = arr.length;
        int[] bit = new int[n + 1];
        for (int i = 1; i <= n; i++) {
            bit[i] += 1;
            int j = i + (i & -i);
            if (j <= n) bit[j] += bit[i];
        }
        int top = 1;
        while (top * 2 <= n) top *= 2;
        int[] ans = new int[n];
        for (int idx = 0; idx < n; idx++) {
            int k = positions[idx];
            int pos = 0;
            for (int step = top; step > 0; step >>= 1) {
                if (pos + step <= n && bit[pos + step] < k) {
                    pos += step;
                    k -= bit[pos];
                }
            }
            int actualIdx = pos + 1;
            ans[idx] = arr[actualIdx - 1];
            for (int i = actualIdx; i <= n; i += i & -i) bit[i]--;
        }
        return ans;
    }
}
