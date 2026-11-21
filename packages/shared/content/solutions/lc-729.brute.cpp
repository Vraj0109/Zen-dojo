#include <vector>
#include <algorithm>

using namespace std;

class MyCalendar {
    vector<pair<int, int>> bookings;

public:
    MyCalendar() {}

    bool book(int startTime, int endTime) {
        for (const auto& b : bookings) {
            if (max(startTime, b.first) < min(endTime, b.second)) {
                return false;
            }
        }
        bookings.push_back({startTime, endTime});
        return true;
    }
};
