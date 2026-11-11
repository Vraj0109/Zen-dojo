import java.util.HashSet;
import java.util.Set;

class Solution {
    public int countDistinctLetters(String s) {
        Set<Character> letters = new HashSet<>();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c >= 'a' && c <= 'z') {
                letters.add(c);
            }
        }
        return letters.size();
    }
}
