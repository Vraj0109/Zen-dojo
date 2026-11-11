import java.util.*;

class Solution {
    private void getSums(int[] v, List<Long> out) {
        out.add(0L);
        for (int x : v) {
            int sz = out.size();
            for (int i = 0; i < sz; i++) {
                out.add(out.get(i) + x);
            }
        }
    }

    public int minAbsDifference(int[] nums, int goal) {
        int n = nums.length;
        int mid = n / 2;
        int[] left = Arrays.copyOfRange(nums, 0, mid);
        int[] right = Arrays.copyOfRange(nums, mid, n);

        List<Long> s1 = new ArrayList<>();
        List<Long> s2 = new ArrayList<>();
        getSums(left, s1);
        getSums(right, s2);

        Collections.sort(s2);
        // remove duplicates
        List<Long> s2Unique = new ArrayList<>();
        for (int i = 0; i < s2.size(); i++) {
            if (i == 0 || !s2.get(i).equals(s2.get(i - 1))) {
                s2Unique.add(s2.get(i));
            }
        }

        long best = Math.abs((long) goal);
        for (long x : s1) {
            long target = (long) goal - x;
            int pos = Collections.binarySearch(s2Unique, target);
            if (pos < 0) pos = -pos - 1;
            if (pos < s2Unique.size()) best = Math.min(best, Math.abs(x + s2Unique.get(pos) - goal));
            if (pos > 0) best = Math.min(best, Math.abs(x + s2Unique.get(pos - 1) - goal));
        }

        return (int) best;
    }
}
