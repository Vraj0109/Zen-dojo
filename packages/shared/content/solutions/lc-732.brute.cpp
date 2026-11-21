#include <vector>
#include <algorithm>

using namespace std;

class MyCalendarThree {
    vector<pair<int, int>> bookings;

public:
    MyCalendarThree() {}

    int book(int startTime, int endTime) {
        bookings.push_back({startTime, endTime});
        vector<int> times;
        for (const auto& b : bookings) {
            times.push_back(b.first);
        }
        int max_overlap = 0;
        for (int t : times) {
            int cnt = 0;
            for (const auto& b : bookings) {
                if (b.first <= t && t < b.second) {
                    cnt++;
                }
            }
            max_overlap = max(max_overlap, cnt);
        }
        return max_overlap;
    }
};
