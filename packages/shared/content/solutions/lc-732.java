import java.util.*;

class MyCalendarThree {
    private final TreeMap<Integer, Integer> change = new TreeMap<>();

    public MyCalendarThree() {}

    public int book(int startTime, int endTime) {
        change.put(startTime, change.getOrDefault(startTime, 0) + 1);
        change.put(endTime, change.getOrDefault(endTime, 0) - 1);
        int running = 0, best = 0;
        for (int v : change.values()) {
            running += v;
            if (running > best) best = running;
        }
        return best;
    }
}
