import java.util.HashSet;
import java.util.Set;

class Solution {
    public int kagamiMochi(int[] d) {
        Set<Integer> set = new HashSet<>();
        for (int x : d) set.add(x);
        return set.size();
    }
}
