#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int minMeetingRooms(vector<vector<int>>& intervals) {
        if (intervals.empty()) return 0;
        int n = intervals.size();
        int maxRooms = 0;
        for (int i = 0; i < n; i++) {
            int t = intervals[i][0];
            int count = 0;
            for (int j = 0; j < n; j++) {
                if (intervals[j][0] <= t && t < intervals[j][1]) {
                    count++;
                }
            }
            maxRooms = max(maxRooms, count);
        }
        return maxRooms;
    }
};
