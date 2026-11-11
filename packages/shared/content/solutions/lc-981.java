import java.util.*;

class TimeMap {
    private static class Entry {
        int timestamp;
        String value;
        Entry(int t, String v) { timestamp = t; value = v; }
    }
    private final Map<String, List<Entry>> data = new HashMap<>();

    public TimeMap() {}

    public void set(String key, String value, int timestamp) {
        data.computeIfAbsent(key, k -> new ArrayList<>()).add(new Entry(timestamp, value));
    }

    public String get(String key, int timestamp) {
        List<Entry> v = data.get(key);
        if (v == null || v.isEmpty()) return "";
        int lo = 0, hi = v.size();
        while (lo < hi) {
            int mid = (lo + hi) >>> 1;
            if (v.get(mid).timestamp <= timestamp) lo = mid + 1;
            else hi = mid;
        }
        return lo == 0 ? "" : v.get(lo - 1).value;
    }
}
