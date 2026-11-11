import java.util.*;

class Solution {
    public long distinctValuesSubarrays(int[] arr) {
        Map<Integer, Integer> lastPos = new HashMap<>();
        long total = 0;
        int l = 0;
        for (int r = 0; r < arr.length; r++) {
            Integer pos = lastPos.get(arr[r]);
            if (pos != null && pos >= l) {
                l = pos + 1;
            }
            lastPos.put(arr[r], r);
            total += (long) (r - l + 1);
        }
        return total;
    }
}
