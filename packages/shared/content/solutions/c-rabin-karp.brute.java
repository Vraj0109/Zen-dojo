import java.util.*;

class Solution {
    public int[] rabinKarp(String pattern, String text) {
        int m = pattern.length();
        int n = text.length();
        if (m > n || m == 0) return new int[0];
        List<Integer> occurrences = new ArrayList<>();
        for (int i = 0; i <= n - m; i++) {
            boolean ok = true;
            for (int j = 0; j < m; j++) {
                if (text.charAt(i + j) != pattern.charAt(j)) {
                    ok = false;
                    break;
                }
            }
            if (ok) {
                occurrences.add(i);
            }
        }
        int[] res = new int[occurrences.size()];
        for (int i = 0; i < occurrences.size(); i++) res[i] = occurrences.get(i);
        return res;
    }
}
