import java.util.*;

class Solution {
    public int[] topKFrequent(int[] nums, int k) {
        Map<Integer, Integer> count = new HashMap<>();
        for (int x : nums) count.put(x, count.getOrDefault(x, 0) + 1);
        List<Integer>[] bucket = new List[nums.length + 1];
        for (int i = 0; i <= nums.length; i++) bucket[i] = new ArrayList<>();
        for (Map.Entry<Integer, Integer> e : count.entrySet()) {
            bucket[e.getValue()].add(e.getKey());
        }
        int[] out = new int[k];
        int idx = 0;
        for (int c = nums.length; c >= 1 && idx < k; c--) {
            for (int v : bucket[c]) {
                if (idx < k) out[idx++] = v;
            }
        }
        return out;
    }
}