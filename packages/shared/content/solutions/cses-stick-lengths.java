import java.util.*;

class Solution {
    public long stickLengths(int[] lengths) {
        Arrays.sort(lengths);
        int median = lengths[lengths.length / 2];
        long total = 0;
        for (int x : lengths) {
            total += Math.abs((long) x - median);
        }
        return total;
    }
}
