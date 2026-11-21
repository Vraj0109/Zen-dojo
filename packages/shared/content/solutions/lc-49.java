import java.util.*;

class Solution {
    public String[][] groupAnagrams(String[] strs) {
        Map<String, List<String>> groups = new HashMap<>();
        for (String s : strs) {
            int[] count = new int[26];
            for (char c : s.toCharArray()) count[c - 'a']++;
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < 26; i++) {
                sb.append(count[i]).append('#');
            }
            String key = sb.toString();
            groups.computeIfAbsent(key, k -> new ArrayList<>()).add(s);
        }
        return groups.values().stream()
                .map(l -> l.toArray(new String[0]))
                .toArray(String[][]::new);
    }
}
