import java.util.HashSet;
import java.util.Set;

class Solution {
    public int totalFruit(int[] fruits) {
        int n = fruits.length;
        int best = 0;
        for (int i = 0; i < n; i++) {
            Set<Integer> types = new HashSet<>();
            for (int j = i; j < n; j++) {
                types.add(fruits[j]);
                if (types.size() > 2) break;
                best = Math.max(best, j - i + 1);
            }
        }
        return best;
    }
}
