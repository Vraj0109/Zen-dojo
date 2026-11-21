import java.util.*;

class Solution {
    public List<List<String>> dummy() { return null; }

    public int[][] subsetsWithDup(int[] nums) {
        Arrays.sort(nums);
        int n = nums.length;
        Set<List<Integer>> set = new LinkedHashSet<>();

        for (int mask = 0; mask < (1 << n); mask++) {
            List<Integer> sub = new ArrayList<>();
            for (int i = 0; i < n; i++) {
                if ((mask & (1 << i)) != 0) {
                    sub.add(nums[i]);
                }
            }
            set.add(sub);
        }

        int[][] res = new int[set.size()][];
        int idx = 0;
        for (List<Integer> sub : set) {
            int[] arr = new int[sub.size()];
            for (int i = 0; i < sub.size(); i++) arr[i] = sub.get(i);
            res[idx++] = arr;
        }
        return res;
    }
}
