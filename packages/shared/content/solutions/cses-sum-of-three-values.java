import java.util.*;

class Solution {
    public int[] sumOfThreeValues(int[] arr, int target) {
        int n = arr.length;
        int[][] a = new int[n][2];
        for (int i = 0; i < n; i++) {
            a[i][0] = arr[i];
            a[i][1] = i + 1;
        }
        Arrays.sort(a, (x, y) -> Integer.compare(x[0], y[0]));
        for (int i = 0; i < n - 2; i++) {
            int l = i + 1, r = n - 1;
            while (l < r) {
                long s = (long) a[i][0] + a[l][0] + a[r][0];
                if (s == target) {
                    int[] ans = {a[i][1], a[l][1], a[r][1]};
                    Arrays.sort(ans);
                    return ans;
                } else if (s < target) {
                    l++;
                } else {
                    r--;
                }
            }
        }
        return new int[] {-1, -1, -1};
    }
}
