import java.util.HashSet;
import java.util.Set;

class Solution {
    public int firstMissingPositive(int[] nums) {
        Set<Integer> seen = new HashSet<>();
        for (int x : nums) seen.add(x);
        int ans = 1;
        while (seen.contains(ans)) {
            ans++;
        }
        return ans;
    }
}
