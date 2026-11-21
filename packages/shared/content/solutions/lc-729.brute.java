import java.util.*;

class MyCalendar {
    private final List<int[]> bookings = new ArrayList<>();

    public MyCalendar() {}

    public boolean book(int startTime, int endTime) {
        for (int[] b : bookings) {
            if (Math.max(startTime, b[0]) < Math.min(endTime, b[1])) {
                return false;
            }
        }
        bookings.add(new int[]{startTime, endTime});
        return true;
    }
}
