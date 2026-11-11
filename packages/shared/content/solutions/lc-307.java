import java.util.*;

class Solution {
    private int n;
    private long[] tree;

    private void add(int i, long delta) {
        for (; i <= n; i += i & -i) tree[i] += delta;
    }

    private long query(int i) {
        long sum = 0;
        for (; i > 0; i -= i & -i) sum += tree[i];
        return sum;
    }

    public int[] rangeSumMutable(int[] nums, int[][] queries) {
        n = nums.length;
        tree = new long[n + 1];
        for (int i = 0; i < n; i++) add(i + 1, nums[i]);

        List<Integer> res = new ArrayList<>();
        for (int[] q : queries) {
            int type = q[0];
            if (type == 1) {
                int idx = q[1], val = q[2];
                long delta = val - nums[idx];
                nums[idx] = val;
                add(idx + 1, delta);
            } else {
                int l = q[1], r = q[2];
                res.add((int)(query(r + 1) - query(l)));
            }
        }
        int[] out = new int[res.size()];
        for (int i = 0; i < res.size(); i++) out[i] = res.get(i);
        return out;
    }
}
