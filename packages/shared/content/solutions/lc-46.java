import java.util.*;

class Solution {
    private List<int[]> res = new ArrayList<>();

    private void backtrack(int[] nums, int idx) {
        if (idx == nums.length) {
            res.add(nums.clone());
            return;
        }
        for (int i = idx; i < nums.length; i++) {
            swap(nums, idx, i);
            backtrack(nums, idx + 1);
            swap(nums, idx, i);
        }
    }

    private void swap(int[] nums, int i, int j) {
        int tmp = nums[i];
        nums[i] = nums[j];
        nums[j] = tmp;
    }

    public int[][] permute(int[] nums) {
        res.clear();
        backtrack(nums, 0);
        return res.toArray(new int[0][]);
    }
}
