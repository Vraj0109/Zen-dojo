import java.util.*;

class Solution {
    public int towers(int[] cubes) {
        List<Integer> tops = new ArrayList<>();
        for (int c : cubes) {
            int low = 0, high = tops.size() - 1;
            int idx = tops.size();
            while (low <= high) {
                int mid = (low + high) >>> 1;
                if (tops.get(mid) > c) {
                    idx = mid;
                    high = mid - 1;
                } else {
                    low = mid + 1;
                }
            }
            if (idx == tops.size()) {
                tops.add(c);
            } else {
                tops.set(idx, c);
            }
        }
        return tops.size();
    }
}
