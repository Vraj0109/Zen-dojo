import java.util.*;

class SnapshotArray {
    private final List<int[]> snapshots = new ArrayList<>();
    private final int[] current;

    public SnapshotArray(int length) {
        current = new int[length];
    }

    public void set(int index, int val) {
        current[index] = val;
    }

    public int snap() {
        snapshots.add(current.clone());
        return snapshots.size() - 1;
    }

    public int get(int index, int snap_id) {
        return snapshots.get(snap_id)[index];
    }
}
