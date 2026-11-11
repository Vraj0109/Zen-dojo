import java.util.*;

class Solution {
    public long[] weirdAlgorithm(int n) {
        List<Long> out = new ArrayList<>();
        long x = n;
        out.add(x);
        while (x != 1) {
            x = (x % 2 == 0) ? x / 2 : 3 * x + 1;
            out.add(x);
        }
        long[] res = new long[out.size()];
        for (int i = 0; i < out.size(); i++) res[i] = out.get(i);
        return res;
    }
}
