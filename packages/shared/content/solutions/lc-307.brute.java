import java.util.*;

class Solution {
    public int[] rangeSumMutable(int[] nums, int[][] queries) {
        int[] a = nums.clone();
        List<Integer> list = new ArrayList<>();
        for (int[] q : queries) {
            int type = q[0];
            if (type == 1) {
                int idx = q[1], val = q[2];
                a[idx] = val;
            } else {
                int l = q[1], r = q[2];
                long sum = 0;
                for (int i = l; i <= r; i++) {
                    sum += a[i];
                }
                list.add((int) sum);
            }
        }
        int[] res = new int[list.size()];
        for (int i = 0; i < list.size(); i++) res[i] = list.get(i);
        return res;
    }
}
