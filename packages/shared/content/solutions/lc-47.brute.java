import java.util.*;

class Solution {
    private void backtrack(int[] nums, boolean[] used, List<Integer> cur, Set<List<Integer>> set) {
        if (cur.size() == nums.length) {
            set.add(new ArrayList<>(cur));
            return;
        }
        for (int i = 0; i < nums.length; i++) {
            if (used[i]) continue;
            used[i] = true;
            cur.add(nums[i]);
            backtrack(nums, used, cur, set);
            cur.remove(cur.size() - 1);
            used[i] = false;
        }
    }

    public int[][] permuteUnique(int[] nums) {
        Set<List<Integer>> set = new LinkedHashSet<>();
        boolean[] used = new boolean[nums.length];
        backtrack(nums, used, new ArrayList<>(), set);

        int[][] res = new int[set.size()][nums.length];
        int idx = 0;
        for (List<Integer> perm : set) {
            for (int i = 0; i < nums.length; i++) {
                res[idx][i] = perm.get(i);
            }
            idx++;
        }
        return res;
    }
}
