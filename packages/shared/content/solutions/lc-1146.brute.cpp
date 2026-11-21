#include <vector>

using namespace std;

class SnapshotArray {
    vector<vector<int>> snapshots;
    vector<int> current;

public:
    SnapshotArray(int length) : current(length, 0) {}

    void set(int index, int val) {
        current[index] = val;
    }

    int snap() {
        snapshots.push_back(current);
        return snapshots.size() - 1;
    }

    int get(int index, int snap_id) {
        return snapshots[snap_id][index];
    }
};
