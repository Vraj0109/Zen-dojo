import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

class Solution {
    public List<Integer> findDuplicates(int[] nums) {
        Set<Integer> seen = new HashSet<>();
        List<Integer> res = new ArrayList<>();
        for (int x : nums) {
            if (seen.contains(x)) {
                res.add(x);
            } else {
                seen.add(x);
            }
        }
        return res;
    }
}
