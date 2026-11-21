import java.util.*;

class MyCalendarTwo {
    private final List<int[]> bookings = new ArrayList<>();

    public MyCalendarTwo() {}

    public boolean book(int startTime, int endTime) {
        List<int[]> temp = new ArrayList<>(bookings);
        temp.add(new int[]{startTime, endTime});
        int n = temp.size();
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                int s1 = Math.max(temp.get(i)[0], temp.get(j)[0]);
                int e1 = Math.min(temp.get(i)[1], temp.get(j)[1]);
                if (s1 < e1) {
                    for (int k = j + 1; k < n; k++) {
                        int s2 = Math.max(s1, temp.get(k)[0]);
                        int e2 = Math.min(e1, temp.get(k)[1]);
                        if (s2 < e2) {
                            return false;
                        }
                    }
                }
            }
        }
        bookings.add(new int[]{startTime, endTime});
        return true;
    }
}
