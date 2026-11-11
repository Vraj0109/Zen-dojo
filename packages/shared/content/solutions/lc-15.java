import java.util.*;

class Solution {
    public int[][] threeSum(int[] nums) {
        Arrays.sort(nums);
        List<int[]> out = new ArrayList<>();
        int n = nums.length;
        for (int i = 0; i + 2 < n && nums[i] <= 0; i++) {
            if (i > 0 && nums[i] == nums[i - 1]) continue;
            int l = i + 1, r = n - 1;
            while (l < r) {
                long s = (long) nums[i] + nums[l] + nums[r];
                if (s < 0) l++;
                else if (s > 0) r--;
                else {
                    out.add(new int[]{nums[i], nums[l], nums[r]});
                    l++;
                    r--;
                    while (l < r && nums[l] == nums[l - 1]) l++;
                    while (l < r && nums[r] == nums[r + 1]) r--;
                }
            }
        }
        return out.toArray(new int[0][]);
    }
}
