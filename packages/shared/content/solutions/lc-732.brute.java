import java.util.*;

class MyCalendarThree {
    private final List<int[]> bookings = new ArrayList<>();

    public MyCalendarThree() {}

    public int book(int startTime, int endTime) {
        bookings.add(new int[]{startTime, endTime});
        int maxOverlap = 0;
        for (int[] b1 : bookings) {
            int t = b1[0];
            int cnt = 0;
            for (int[] b2 : bookings) {
                if (b2[0] <= t && t < b2[1]) {
                    cnt++;
                }
            }
            maxOverlap = Math.max(maxOverlap, cnt);
        }
        return maxOverlap;
    }
}
