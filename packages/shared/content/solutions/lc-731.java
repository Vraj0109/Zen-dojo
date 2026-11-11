import java.util.*;

class MyCalendarTwo {
    private final List<int[]> all = new ArrayList<>();
    private final List<int[]> doubles = new ArrayList<>();

    public MyCalendarTwo() {}

    public boolean book(int startTime, int endTime) {
        for (int[] d : doubles) {
            if (startTime < d[1] && endTime > d[0]) return false;
        }
        for (int[] b : all) {
            int s = Math.max(startTime, b[0]);
            int e = Math.min(endTime, b[1]);
            if (s < e) doubles.add(new int[]{s, e});
        }
        all.add(new int[]{startTime, endTime});
        return true;
    }
}
