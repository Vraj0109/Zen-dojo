import java.util.ArrayList;
import java.util.List;

class Solution {
    public int[] findingPeriods(String s) {
        int n = s.length();
        int[] z = new int[n];
        int l = 0, r = 0;
        for (int i = 1; i < n; i++) {
            if (i <= r) z[i] = Math.min(r - i + 1, z[i - l]);
            while (i + z[i] < n && s.charAt(z[i]) == s.charAt(i + z[i])) z[i]++;
            if (i + z[i] - 1 > r) {
                l = i;
                r = i + z[i] - 1;
            }
        }

        List<Integer> periods = new ArrayList<>();
        for (int p = 1; p < n; p++) {
            if (z[p] >= n - p) {
                periods.add(p);
            }
        }
        periods.add(n);
        int[] res = new int[periods.size()];
        for (int i = 0; i < periods.size(); i++) res[i] = periods.get(i);
        return res;
    }
}
