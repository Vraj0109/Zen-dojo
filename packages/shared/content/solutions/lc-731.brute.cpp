#include <vector>
#include <algorithm>

using namespace std;

class MyCalendarTwo {
    vector<pair<int, int>> bookings;

public:
    MyCalendarTwo() {}

    bool book(int startTime, int endTime) {
        vector<pair<int, int>> temp = bookings;
        temp.push_back({startTime, endTime});
        int n = temp.size();
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                int s1 = max(temp[i].first, temp[j].first);
                int e1 = min(temp[i].second, temp[j].second);
                if (s1 < e1) {
                    for (int k = j + 1; k < n; k++) {
                        int s2 = max(s1, temp[k].first);
                        int e2 = min(e1, temp[k].second);
                        if (s2 < e2) {
                            return false;
                        }
                    }
                }
            }
        }
        bookings.push_back({startTime, endTime});
        return true;
    }
};
