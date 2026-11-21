import java.util.*;

class LRUCache {
    private static class Entry {
        int key, val, time;
        Entry(int k, int v, int t) {
            key = k;
            val = v;
            time = t;
        }
    }

    private final int cap;
    private int timer = 0;
    private final List<Entry> data = new ArrayList<>();

    public LRUCache(int capacity) {
        this.cap = capacity;
    }

    public int get(int key) {
        timer++;
        for (Entry e : data) {
            if (e.key == key) {
                e.time = timer;
                return e.val;
            }
        }
        return -1;
    }

    public void put(int key, int value) {
        timer++;
        for (Entry e : data) {
            if (e.key == key) {
                e.val = value;
                e.time = timer;
                return;
            }
        }
        if (data.size() == cap) {
            int oldestIdx = 0;
            for (int i = 1; i < data.size(); i++) {
                if (data.get(i).time < data.get(oldestIdx).time) {
                    oldestIdx = i;
                }
            }
            data.remove(oldestIdx);
        }
        data.add(new Entry(key, value, timer));
    }
}
