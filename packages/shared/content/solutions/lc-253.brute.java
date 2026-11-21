public class Solution {
    public int minMeetingRooms(int[][] intervals) {
        if (intervals.length == 0) return 0;
        int n = intervals.length;
        int maxRooms = 0;
        for (int i = 0; i < n; i++) {
            int t = intervals[i][0];
            int count = 0;
            for (int j = 0; j < n; j++) {
                if (intervals[j][0] <= t && t < intervals[j][1]) {
                    count++;
                }
            }
            maxRooms = Math.max(maxRooms, count);
        }
        return maxRooms;
    }
}
