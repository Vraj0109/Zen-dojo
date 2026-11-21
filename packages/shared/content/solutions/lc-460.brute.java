import java.util.*;

class LFUCache {
    private static class Entry {
        int key, val, freq, time;
        Entry(int k, int v, int f, int t) {
            key = k;
            val = v;
            freq = f;
            time = t;
        }
    }

    private final int cap;
    private int timer = 0;
    private final List<Entry> data = new ArrayList<>();

    public LFUCache(int capacity) {
        this.cap = capacity;
    }

    public int get(int key) {
        if (cap == 0) return -1;
        timer++;
        for (Entry e : data) {
            if (e.key == key) {
                e.freq++;
                e.time = timer;
                return e.val;
            }
        }
        return -1;
    }

    public void put(int key, int value) {
        if (cap == 0) return;
        timer++;
        for (Entry e : data) {
            if (e.key == key) {
                e.val = value;
                e.freq++;
                e.time = timer;
                return;
            }
        }
        if (data.size() == cap) {
            int victimIdx = 0;
            for (int i = 1; i < data.size(); i++) {
                Entry cur = data.get(i);
                Entry best = data.get(victimIdx);
                if (cur.freq < best.freq || (cur.freq == best.freq && cur.time < best.time)) {
                    victimIdx = i;
                }
            }
            data.remove(victimIdx);
        }
        data.add(new Entry(key, value, 1, timer));
    }
}
