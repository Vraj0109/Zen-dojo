import java.util.*;

class Solution {
    private final int[] prefix;
    private final Random rand = new Random();

    public Solution(int[] w) {
        prefix = new int[w.length];
        int sum = 0;
        for (int i = 0; i < w.length; i++) {
            sum += w[i];
            prefix[i] = sum;
        }
    }

    public int pickIndex() {
        int total = prefix[prefix.length - 1];
        int val = rand.nextInt(total) + 1;
        int lo = 0, hi = prefix.length;
        while (lo < hi) {
            int mid = (lo + hi) >>> 1;
            if (prefix[mid] >= val) hi = mid;
            else lo = mid + 1;
        }
        return lo;
    }
}
