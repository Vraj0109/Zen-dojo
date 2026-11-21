import java.util.*;

class Solution {
    public long distinctValuesSubarrays(int[] arr) {
        Map<Integer, Integer> lastPos = new HashMap<>();
        long total = 0;
        int l = 0;
        for (int r = 0; r < arr.length; r++) {
            Integer prev = lastPos.get(arr[r]);
            if (prev != null && prev >= l) {
                l = prev + 1;
            }
            lastPos.put(arr[r], r);
            total += (r - l + 1);
        }
        return total;
    }
}
