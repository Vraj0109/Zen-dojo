#include <string>
#include <vector>

using namespace std;

class TimeMap {
    struct Entry {
        string key;
        string value;
        int timestamp;
    };
    vector<Entry> entries;

public:
    TimeMap() {}

    void set(string key, string value, int timestamp) {
        entries.push_back({key, value, timestamp});
    }

    string get(string key, int timestamp) {
        string res = "";
        int bestTime = -1;
        for (const auto& e : entries) {
            if (e.key == key && e.timestamp <= timestamp) {
                if (e.timestamp > bestTime) {
                    bestTime = e.timestamp;
                    res = e.value;
                }
            }
        }
        return res;
    }
};
