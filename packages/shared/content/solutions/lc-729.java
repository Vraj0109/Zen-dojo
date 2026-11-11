import java.util.*;

class MyCalendar {
    private final TreeMap<Integer, Integer> booked = new TreeMap<>();

    public MyCalendar() {}

    public boolean book(int startTime, int endTime) {
        Integer nextStart = booked.ceilingKey(startTime);
        if (nextStart != null && nextStart < endTime) return false;
        Integer prevStart = booked.lowerKey(startTime);
        if (prevStart != null && booked.get(prevStart) > startTime) return false;
        booked.put(startTime, endTime);
        return true;
    }
}
