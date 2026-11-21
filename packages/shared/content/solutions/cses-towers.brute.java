import java.util.*;

class Solution {
    public int towers(int[] cubes) {
        List<Integer> tops = new ArrayList<>();
        for (int c : cubes) {
            int idx = upperBound(tops, c);
            if (idx == tops.size()) {
                tops.add(c);
            } else {
                tops.set(idx, c);
            }
        }
        return tops.size();
    }

    private int upperBound(List<Integer> list, int val) {
        int l = 0, r = list.size();
        while (l < r) {
            int mid = (l + r) / 2;
            if (list.get(mid) > val) {
                r = mid;
            } else {
                l = mid + 1;
            }
        }
        return l;
    }
}
