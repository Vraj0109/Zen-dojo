import java.util.*;

class Solution {
    private void go(int[] a, int start, int rem, List<Integer> cur, List<int[]> out) {
        if (rem == 0) {
            int[] item = new int[cur.size()];
            for (int i = 0; i < cur.size(); i++) item[i] = cur.get(i);
            out.add(item);
            return;
        }
        for (int i = start; i < a.length; i++) {
            if (a[i] > rem) break;
            if (i > start && a[i] == a[i - 1]) continue;
            cur.add(a[i]);
            go(a, i + 1, rem - a[i], cur, out);
            cur.remove(cur.size() - 1);
        }
    }
    public int[][] combinationSum2(int[] candidates, int target) {
        Arrays.sort(candidates);
        List<int[]> out = new ArrayList<>();
        List<Integer> cur = new ArrayList<>();
        go(candidates, 0, target, cur, out);
        return out.toArray(new int[out.size()][]);
    }
}