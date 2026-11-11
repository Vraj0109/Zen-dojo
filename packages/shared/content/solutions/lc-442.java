import java.util.*;

class Solution {
    public int[] findDuplicates(int[] nums) {
        List<Integer> out = new ArrayList<>();
        for (int i = 0; i < nums.length; i++) {
            int v = Math.abs(nums[i]);
            if (nums[v - 1] < 0) out.add(v);
            else nums[v - 1] = -nums[v - 1];
        }
        int[] res = new int[out.size()];
        for (int i = 0; i < out.size(); i++) res[i] = out.get(i);
        return res;
    }
}