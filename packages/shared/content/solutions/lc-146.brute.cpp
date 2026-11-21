#include <list>
#include <vector>
#include <algorithm>

using namespace std;

class LRUCache {
    struct Entry {
        int key;
        int val;
        int time;
    };
    int cap;
    int timer = 0;
    vector<Entry> data;

public:
    LRUCache(int capacity) : cap(capacity) {}

    int get(int key) {
        timer++;
        for (auto& e : data) {
            if (e.key == key) {
                e.time = timer;
                return e.val;
            }
        }
        return -1;
    }

    void put(int key, int value) {
        timer++;
        for (auto& e : data) {
            if (e.key == key) {
                e.val = value;
                e.time = timer;
                return;
            }
        }
        if ((int)data.size() == cap) {
            int oldestIdx = 0;
            for (int i = 1; i < (int)data.size(); i++) {
                if (data[i].time < data[oldestIdx].time) {
                    oldestIdx = i;
                }
            }
            data.erase(data.begin() + oldestIdx);
        }
        data.push_back({key, value, timer});
    }
};
