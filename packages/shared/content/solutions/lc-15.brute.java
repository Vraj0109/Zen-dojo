import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

class Solution {
    public List<List<Integer>> threeSum(int[] nums) {
        int n = nums.length;
        Set<List<Integer>> unique = new HashSet<>();
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                for (int k = j + 1; k < n; k++) {
                    if (nums[i] + nums[j] + nums[k] == 0) {
                        int[] t = new int[]{nums[i], nums[j], nums[k]};
                        Arrays.sort(t);
                        unique.add(Arrays.asList(t[0], t[1], t[2]));
                    }
                }
            }
        }
        return new ArrayList<>(unique);
    }
}
