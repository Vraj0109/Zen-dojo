import java.util.*;

class SnapshotArray {
    private static class Entry {
        int snapId, val;
        Entry(int s, int v) { snapId = s; val = v; }
    }
    private final List<List<Entry>> history;
    private int snaps = 0;

    public SnapshotArray(int length) {
        history = new ArrayList<>(length);
        for (int i = 0; i < length; i++) {
            List<Entry> h = new ArrayList<>();
            h.add(new Entry(0, 0));
            history.add(h);
        }
    }

    public void set(int index, int val) {
        List<Entry> h = history.get(index);
        Entry last = h.get(h.size() - 1);
        if (last.snapId == snaps) {
            last.val = val;
        } else {
            h.add(new Entry(snaps, val));
        }
    }

    public int snap() {
        return snaps++;
    }

    public int get(int index, int snap_id) {
        List<Entry> h = history.get(index);
        int lo = 0, hi = h.size();
        while (lo < hi) {
            int mid = (lo + hi) >>> 1;
            if (h.get(mid).snapId <= snap_id) lo = mid + 1;
            else hi = mid;
        }
        return h.get(lo - 1).val;
    }
}
