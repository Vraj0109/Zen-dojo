import java.util.ArrayList;
import java.util.List;

class Solution {
    public long nonAbundantSum(int limit) {
        int L = Math.min(limit, 28123);
        int[] sig = new int[L + 1];
        for (int d = 1; d <= L / 2; d++) {
            for (int m = 2 * d; m <= L; m += d) {
                sig[m] += d;
            }
        }
        List<Integer> ab = new ArrayList<>();
        for (int i = 1; i <= L; i++) {
            if (sig[i] > i) ab.add(i);
        }
        boolean[] mark = new boolean[L + 1];
        for (int i = 0; i < ab.size(); i++) {
            int a = ab.get(i);
            for (int j = i; j < ab.size() && a + ab.get(j) <= L; j++) {
                mark[a + ab.get(j)] = true;
            }
        }
        long sum = 0;
        for (int i = 1; i <= L; i++) {
            if (!mark[i]) sum += i;
        }
        return sum;
    }
}
