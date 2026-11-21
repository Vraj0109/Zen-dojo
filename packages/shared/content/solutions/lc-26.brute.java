import java.util.*;

class Solution {
    public int[] removeDuplicates(int[] nums) {
        Set<Integer> seen = new HashSet<>();
        List<Integer> list = new ArrayList<>();
        for (int x : nums) {
            if (!seen.contains(x)) {
                seen.add(x);
                list.add(x);
            }
        }
        int[] res = new int[list.size()];
        for (int i = 0; i < list.size(); i++) res[i] = list.get(i);
        return res;
    }
}
