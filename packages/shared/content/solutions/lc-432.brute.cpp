#include <string>
#include <vector>
#include <unordered_map>
#include <climits>

using namespace std;

class AllOne {
    unordered_map<string, int> counts;

public:
    AllOne() {}

    void inc(string key) {
        counts[key]++;
    }

    void dec(string key) {
        counts[key]--;
        if (counts[key] == 0) {
            counts.erase(key);
        }
    }

    string getMaxKey() {
        if (counts.empty()) return "";
        string maxKey = "";
        int maxVal = INT_MIN;
        for (const auto& p : counts) {
            if (p.second > maxVal) {
                maxVal = p.second;
                maxKey = p.first;
            }
        }
        return maxKey;
    }

    string getMinKey() {
        if (counts.empty()) return "";
        string minKey = "";
        int minVal = INT_MAX;
        for (const auto& p : counts) {
            if (p.second < minVal) {
                minVal = p.second;
                minKey = p.first;
            }
        }
        return minKey;
    }
};
