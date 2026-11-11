import java.util.HashSet;
import java.util.Set;

class Solution {
    public boolean isPangramString(String s) {
        Set<Character> seen = new HashSet<>();
        for (int i = 0; i < s.length(); i++) {
            char c = Character.toLowerCase(s.charAt(i));
            if (c >= 'a' && c <= 'z') {
                seen.add(c);
            }
        }
        return seen.size() == 26;
    }
}
