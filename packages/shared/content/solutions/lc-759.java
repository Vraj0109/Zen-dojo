import java.util.*;

class Solution {
    public int[][] employeeFreeTime(int[][] intervals) {
        if (intervals.length == 0) return new int[0][];
        Arrays.sort(intervals, (a, b) -> a[0] != b[0] ? a[0] - b[0] : a[1] - b[1]);

        List<int[]> res = new ArrayList<>();
        int curEnd = intervals[0][1];
        for (int i = 1; i < intervals.length; i++) {
            if (intervals[i][0] > curEnd) {
                res.add(new int[]{curEnd, intervals[i][0]});
                curEnd = intervals[i][1];
            } else {
                curEnd = Math.max(curEnd, intervals[i][1]);
            }
        }
        return res.toArray(new int[0][]);
    }
}
