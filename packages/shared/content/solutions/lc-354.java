import java.util.*;

class Solution {
    public int maxEnvelopes(int[][] envelopes) {
        Arrays.sort(envelopes, (a, b) -> a[0] != b[0] ? Integer.compare(a[0], b[0]) : Integer.compare(b[1], a[1]));
        List<Integer> tails = new ArrayList<>();
        for (int[] e : envelopes) {
            int idx = Collections.binarySearch(tails, e[1]);
            if (idx < 0) idx = -(idx + 1);
            if (idx == tails.size()) tails.add(e[1]);
            else tails.set(idx, e[1]);
        }
        return tails.size();
    }
}