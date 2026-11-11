import java.util.*;

class Solution {
    public long[] slidingWindowMedian(int[] nums, int k) {
        int n = nums.length;
        long[] out = new long[n - k + 1];

        // Two multiset heaps using TreeMap<Integer, Integer> (value -> count)
        TreeMap<Integer, Integer> lo = new TreeMap<>(Collections.reverseOrder());
        TreeMap<Integer, Integer> hi = new TreeMap<>();
        int loSize = 0, hiSize = 0;

        int targetLo = (k + 1) / 2;

        for (int i = 0; i < n; i++) {
            int x = nums[i];
            if (loSize == 0 || x <= lo.firstKey()) {
                lo.put(x, lo.getOrDefault(x, 0) + 1);
                loSize++;
            } else {
                hi.put(x, hi.getOrDefault(x, 0) + 1);
                hiSize++;
            }

            // rebalance
            while (loSize > targetLo) {
                int maxLo = lo.firstKey();
                removeOne(lo, maxLo);
                loSize--;
                hi.put(maxLo, hi.getOrDefault(maxLo, 0) + 1);
                hiSize++;
            }
            while (loSize < targetLo && hiSize > 0) {
                int minHi = hi.firstKey();
                removeOne(hi, minHi);
                hiSize--;
                lo.put(minHi, lo.getOrDefault(minHi, 0) + 1);
                loSize++;
            }

            if (i >= k - 1) {
                if (k % 2 == 1) {
                    out[i - k + 1] = 2L * lo.firstKey();
                } else {
                    out[i - k + 1] = (long) lo.firstKey() + hi.firstKey();
                }

                // remove outgoing element nums[i - k + 1]
                int rem = nums[i - k + 1];
                if (lo.containsKey(rem)) {
                    removeOne(lo, rem);
                    loSize--;
                } else {
                    removeOne(hi, rem);
                    hiSize--;
                }

                // rebalance after removal
                while (loSize > targetLo) {
                    int maxLo = lo.firstKey();
                    removeOne(lo, maxLo);
                    loSize--;
                    hi.put(maxLo, hi.getOrDefault(maxLo, 0) + 1);
                    hiSize++;
                }
                while (loSize < targetLo && hiSize > 0) {
                    int minHi = hi.firstKey();
                    removeOne(hi, minHi);
                    hiSize--;
                    lo.put(minHi, lo.getOrDefault(minHi, 0) + 1);
                    loSize++;
                }
            }
        }
        return out;
    }

    private void removeOne(TreeMap<Integer, Integer> map, int key) {
        int cnt = map.get(key);
        if (cnt == 1) map.remove(key);
        else map.put(key, cnt - 1);
    }
}
