import java.util.*;

class Solution {
    public int minimumDifference(int[] nums) {
        int n2 = nums.length;
        int n = n2 / 2;
        long total = 0;
        for (int x : nums) total += x;

        List<List<Long>> left = new ArrayList<>(), right = new ArrayList<>();
        for (int i = 0; i <= n; i++) {
            left.add(new ArrayList<>());
            right.add(new ArrayList<>());
        }
        for (int mask = 0; mask < (1 << n); mask++) {
            int cnt = Integer.bitCount(mask);
            long s1 = 0, s2 = 0;
            for (int i = 0; i < n; i++) {
                if ((mask & (1 << i)) != 0) {
                    s1 += nums[i];
                    s2 += nums[n + i];
                }
            }
            left.get(cnt).add(s1);
            right.get(cnt).add(s2);
        }

        for (int k = 0; k <= n; k++) {
            Collections.sort(right.get(k));
        }

        long ans = Long.MAX_VALUE;
        for (int k = 0; k <= n; k++) {
            int need = n - k;
            List<Long> rList = right.get(need);
            for (long s1 : left.get(k)) {
                long target = (total - 2 * s1) / 2;
                int pos = Collections.binarySearch(rList, target);
                if (pos < 0) pos = -pos - 1;
                if (pos < rList.size()) {
                    long s2 = rList.get(pos);
                    ans = Math.min(ans, Math.abs(total - 2 * (s1 + s2)));
                }
                if (pos > 0) {
                    long s2 = rList.get(pos - 1);
                    ans = Math.min(ans, Math.abs(total - 2 * (s1 + s2)));
                }
            }
        }

        return (int) ans;
    }
}
