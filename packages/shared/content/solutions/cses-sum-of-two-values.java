import java.util.*;

class Solution {
    public int[] sumOfTwoValues(int[] arr, int target) {
        int n = arr.length;
        int[][] sorted = new int[n][2];
        for (int i = 0; i < n; i++) {
            sorted[i][0] = arr[i];
            sorted[i][1] = i + 1;
        }
        Arrays.sort(sorted, (a, b) -> a[0] != b[0] ? Integer.compare(a[0], b[0]) : Integer.compare(a[1], b[1]));

        for (int i = 1; i <= n; i++) {
            int needed = target - arr[i - 1];
            int low = 0, high = n - 1;
            int foundIdx = -1;
            while (low <= high) {
                int mid = (low + high) >>> 1;
                if (sorted[mid][0] == needed) {
                    if (sorted[mid][1] >= i + 1) {
                        foundIdx = mid;
                        high = mid - 1;
                    } else {
                        low = mid + 1;
                    }
                } else if (sorted[mid][0] < needed) {
                    low = mid + 1;
                } else {
                    high = mid - 1;
                }
            }
            if (foundIdx != -1 && sorted[foundIdx][0] == needed) {
                return new int[] {i, sorted[foundIdx][1]};
            }
        }
        return new int[] {-1, -1};
    }
}
