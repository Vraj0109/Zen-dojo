#include <vector>
#include <algorithm>

using namespace std;

class LFUCache {
    struct Entry {
        int key;
        int val;
        int freq;
        int time;
    };
    int cap;
    int timer = 0;
    vector<Entry> data;

public:
    LFUCache(int capacity) : cap(capacity) {}

    int get(int key) {
        if (cap == 0) return -1;
        timer++;
        for (auto& e : data) {
            if (e.key == key) {
                e.freq++;
                e.time = timer;
                return e.val;
            }
        }
        return -1;
    }

    void put(int key, int value) {
        if (cap == 0) return;
        timer++;
        for (auto& e : data) {
            if (e.key == key) {
                e.val = value;
                e.freq++;
                e.time = timer;
                return;
            }
        }
        if ((int)data.size() == cap) {
            int victimIdx = 0;
            for (int i = 1; i < (int)data.size(); i++) {
                if (data[i].freq < data[victimIdx].freq || 
                   (data[i].freq == data[victimIdx].freq && data[i].time < data[victimIdx].time)) {
                    victimIdx = i;
                }
            }
            data.erase(data.begin() + victimIdx);
        }
        data.push_back({key, value, 1, timer});
    }
};
