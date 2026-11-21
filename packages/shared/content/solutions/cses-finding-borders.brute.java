import java.util.*;

public class Solution {
    public int[] findingBorders(String s) {
        int n = s.length();
        List<Integer> list = new ArrayList<>();
        for (int len = 1; len < n; len++) {
            boolean match = true;
            for (int i = 0; i < len; i++) {
                if (s.charAt(i) != s.charAt(n - len + i)) {
                    match = false;
                    break;
                }
            }
            if (match) {
                list.add(len);
            }
        }
        int[] res = new int[list.size()];
        for (int i = 0; i < list.size(); i++) res[i] = list.get(i);
        return res;
    }
}
