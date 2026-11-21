import java.util.*;

class Solution {
    public int[] singleNumber(int[] nums) {
        Map<Integer, Integer> cnt = new HashMap<>();
        for (int x : nums) cnt.put(x, cnt.getOrDefault(x, 0) + 1);
        int[] res = new int[2];
        int idx = 0;
        for (Map.Entry<Integer, Integer> entry : cnt.entrySet()) {
            if (entry.getValue() == 1) res[idx++] = entry.getKey();
        }
        return res;
    }
}
