import java.util.*;

class Solution {
    public int findMaximumXOR(int[] nums) {
        int best = 0;
        for (int bit = 30; bit >= 0; bit--) {
            Set<Integer> prefixes = new HashSet<>();
            for (int x : nums) prefixes.add(x >> bit);
            int cand = (best << 1) | 1;
            boolean ok = false;
            for (int p : prefixes) {
                if (prefixes.contains(cand ^ p)) {
                    ok = true;
                    break;
                }
            }
            best = ok ? cand : (best << 1);
        }
        return best;
    }
}