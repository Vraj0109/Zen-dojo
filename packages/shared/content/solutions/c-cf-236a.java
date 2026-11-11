import java.util.HashSet;
import java.util.Set;

class Solution {
    public String determineGender(String name) {
        Set<Character> distinct = new HashSet<>();
        for (int i = 0; i < name.length(); i++) {
            distinct.add(name.charAt(i));
        }
        return (distinct.size() % 2 == 0) ? "CHAT WITH HER!" : "IGNORE HIM!";
    }
}
