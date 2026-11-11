import java.util.*;

class Solution {
    private void go(int[] a, boolean[] used, List<Integer> cur, List<int[]> out) {
        if (cur.size() == a.length) {
            int[] item = new int[cur.size()];
            for (int i = 0; i < cur.size(); i++) item[i] = cur.get(i);
            out.add(item);
            return;
        }
        for (int i = 0; i < a.length; i++) {
            if (used[i]) continue;
            if (i > 0 && a[i] == a[i - 1] && !used[i - 1]) continue;
            used[i] = true;
            cur.add(a[i]);
            go(a, used, cur, out);
            cur.remove(cur.size() - 1);
            used[i] = false;
        }
    }
    public int[][] permuteUnique(int[] nums) {
        Arrays.sort(nums);
        List<int[]> out = new ArrayList<>();
        List<Integer> cur = new ArrayList<>();
        boolean[] used = new boolean[nums.length];
        go(nums, used, cur, out);
        return out.toArray(new int[out.size()][]);
    }
}