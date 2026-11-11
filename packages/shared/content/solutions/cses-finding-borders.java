import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

class Solution {
    public int[] findingBorders(String s) {
        int n = s.length();
        if (n <= 1) return new int[0];

        int[] pi = new int[n];
        for (int i = 1; i < n; i++) {
            int j = pi[i - 1];
            while (j > 0 && s.charAt(i) != s.charAt(j)) j = pi[j - 1];
            if (s.charAt(i) == s.charAt(j)) j++;
            pi[i] = j;
        }

        List<Integer> borders = new ArrayList<>();
        int k = pi[n - 1];
        while (k > 0) {
            borders.add(k);
            k = pi[k - 1];
        }

        Collections.reverse(borders);
        int[] res = new int[borders.size()];
        for (int i = 0; i < borders.size(); i++) res[i] = borders.get(i);
        return res;
    }
}
