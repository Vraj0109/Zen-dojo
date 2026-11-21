import java.util.HashSet;
import java.util.Set;

class Solution {
    public int lengthOfLongestSubstring(String s) {
        int n = s.length();
        int best = 0;
        for (int i = 0; i < n; i++) {
            Set<Character> seen = new HashSet<>();
            for (int j = i; j < n; j++) {
                char c = s.charAt(j);
                if (seen.contains(c)) break;
                seen.add(c);
                best = Math.max(best, j - i + 1);
            }
        }
        return best;
    }
}
