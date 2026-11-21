import java.util.Arrays;
import java.util.Comparator;

class Solution {
    private int maxKeep(int[][] intervals, int i, int prevEnd) {
        if (i == intervals.length) return 0;
        int res = maxKeep(intervals, i + 1, prevEnd);
        if (intervals[i][0] >= prevEnd) {
            res = Math.max(res, 1 + maxKeep(intervals, i + 1, intervals[i][1]));
        }
        return res;
    }

    public int eraseOverlapIntervals(int[][] intervals) {
        Arrays.sort(intervals, Comparator.comparingInt(a -> a[0]));
        int kept = maxKeep(intervals, 0, -1000000000);
        return intervals.length - kept;
    }
}
