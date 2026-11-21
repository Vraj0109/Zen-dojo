import java.util.*;

class Solution {
    private void backtrack(int[] c, int idx, int sum, int target, List<Integer> cur, Set<List<Integer>> res) {
        if (sum == target) {
            res.add(new ArrayList<>(cur));
            return;
        }
        if (sum > target || idx == c.length) return;

        // Choice 1: include
        cur.add(c[idx]);
        backtrack(c, idx + 1, sum + c[idx], target, cur, res);
        cur.remove(cur.size() - 1);

        // Choice 2: exclude
        backtrack(c, idx + 1, sum, target, cur, res);
    }

    public int[][] combinationSum2(int[] candidates, int target) {
        Arrays.sort(candidates);
        Set<List<Integer>> res = new LinkedHashSet<>();
        backtrack(candidates, 0, 0, target, new ArrayList<>(), res);

        int[][] out = new int[res.size()][];
        int i = 0;
        for (List<Integer> list : res) {
            int[] arr = new int[list.size()];
            for (int j = 0; j < list.size(); j++) arr[j] = list.get(j);
            out[i++] = arr;
        }
        return out;
    }
}
