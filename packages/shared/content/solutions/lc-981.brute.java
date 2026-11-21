import java.util.*;

class TimeMap {
    private static class Entry {
        String key;
        String value;
        int timestamp;
        Entry(String k, String v, int t) {
            key = k;
            value = v;
            timestamp = t;
        }
    }

    private final List<Entry> entries = new ArrayList<>();

    public TimeMap() {}

    public void set(String key, String value, int timestamp) {
        entries.add(new Entry(key, value, timestamp));
    }

    public String get(String key, int timestamp) {
        String res = "";
        int bestTime = -1;
        for (Entry e : entries) {
            if (e.key.equals(key) && e.timestamp <= timestamp) {
                if (e.timestamp > bestTime) {
                    bestTime = e.timestamp;
                    res = e.value;
                }
            }
        }
        return res;
    }
}
