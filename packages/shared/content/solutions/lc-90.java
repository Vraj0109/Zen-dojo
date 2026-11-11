import java.util.*;

class Solution {
    private void go(int[] a, int start, List<Integer> cur, List<int[]> out) {
        int[] item = new int[cur.size()];
        for (int i = 0; i < cur.size(); i++) item[i] = cur.get(i);
        out.add(item);
        for (int i = start; i < a.length; i++) {
            if (i > start && a[i] == a[i - 1]) continue;
            cur.add(a[i]);
            go(a, i + 1, cur, out);
            cur.remove(cur.size() - 1);
        }
    }
    public int[][] subsetsWithDup(int[] nums) {
        Arrays.sort(nums);
        List<int[]> out = new ArrayList<>();
        List<Integer> cur = new ArrayList<>();
        go(nums, 0, cur, out);
        return out.toArray(new int[out.size()][]);
    }
}