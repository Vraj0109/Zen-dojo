import java.util.*;

public class Solution {
    public int[] findingPeriods(String s) {
        int n = s.length();
        List<Integer> list = new ArrayList<>();
        for (int p = 1; p < n; p++) {
            boolean ok = true;
            for (int i = 0; i < n - p; i++) {
                if (s.charAt(i) != s.charAt(i + p)) {
                    ok = false;
                    break;
                }
            }
            if (ok) list.add(p);
        }
        list.add(n);
        int[] res = new int[list.size()];
        for (int i = 0; i < list.size(); i++) res[i] = list.get(i);
        return res;
    }
}
