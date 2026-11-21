#include <vector>

using namespace std;

class HitCounter {
    vector<int> hits;

public:
    HitCounter() {}

    void hit(int timestamp) {
        hits.push_back(timestamp);
    }

    int getHits(int timestamp) {
        int cnt = 0;
        for (int t : hits) {
            if (t > timestamp - 300 && t <= timestamp) {
                cnt++;
            }
        }
        return cnt;
    }
};
