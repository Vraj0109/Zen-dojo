import java.util.*;

class Solution {
    public long subarraySumsII(int[] arr, int target) {
        Map<Long, Integer> freq = new HashMap<>();
        freq.put(0L, 1);
        long pref = 0;
        long count = 0;
        for (int x : arr) {
            pref += x;
            Integer c = freq.get(pref - target);
            if (c != null) {
                count += c;
            }
            freq.put(pref, freq.getOrDefault(pref, 0) + 1);
        }
        return count;
    }
}
