import java.util.*;

class Solution {
    public int[] hotelQueries(int[] rooms, int[] groups) {
        int n = rooms.length, sz = 1;
        while (sz < n) sz <<= 1;
        int[] t = new int[2 * sz];
        for (int i = 0; i < n; i++) t[sz + i] = rooms[i];
        for (int i = sz - 1; i >= 1; i--) t[i] = Math.max(t[2 * i], t[2 * i + 1]);
        int[] ans = new int[groups.length];
        for (int i = 0; i < groups.length; i++) {
            int r = groups[i];
            if (t[1] < r) {
                ans[i] = 0;
                continue;
            }
            int p = 1;
            while (p < sz) {
                p = (t[2 * p] >= r) ? (2 * p) : (2 * p + 1);
            }
            t[p] -= r;
            ans[i] = p - sz + 1;
            for (p >>= 1; p >= 1; p >>= 1) {
                t[p] = Math.max(t[2 * p], t[2 * p + 1]);
            }
        }
        return ans;
    }
}
