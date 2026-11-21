import java.util.ArrayList;
import java.util.List;

class Solution {
    private boolean isAnagram(String a, String b) {
        if (a.length() != b.length()) return false;
        int[] count = new int[26];
        for (char c : a.toCharArray()) count[c - 'a']++;
        for (char c : b.toCharArray()) {
            if (--count[c - 'a'] < 0) return false;
        }
        return true;
    }

    public String[][] groupAnagrams(String[] strs) {
        int n = strs.length;
        boolean[] visited = new boolean[n];
        List<List<String>> res = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            if (visited[i]) continue;
            List<String> group = new ArrayList<>();
            group.add(strs[i]);
            visited[i] = true;
            for (int j = i + 1; j < n; j++) {
                if (!visited[j] && isAnagram(strs[i], strs[j])) {
                    visited[j] = true;
                    group.add(strs[j]);
                }
            }
            res.add(group);
        }
        return res.stream()
                .map(l -> l.toArray(new String[0]))
                .toArray(String[][]::new);
    }
}
