#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<vector<int>> employeeFreeTime(vector<vector<int>>& intervals) {
        if (intervals.empty()) return {};

        // Brute force: collect all distinct endpoints, check each gap (endpoints[i], endpoints[i+1])
        set<int> points;
        for (const auto& iv : intervals) {
            points.insert(iv[0]);
            points.insert(iv[1]);
        }

        vector<int> sortedPoints(points.begin(), points.end());
        vector<vector<int>> res;

        for (size_t i = 0; i + 1 < sortedPoints.size(); i++) {
            int start = sortedPoints[i];
            int end = sortedPoints[i + 1];
            if (start >= end) continue;

            // Check if any employee is working during (start, end)
            // It's covered if some interval covers [start, end]
            bool busy = false;
            for (const auto& iv : intervals) {
                if (iv[0] <= start && iv[1] >= end) {
                    busy = true;
                    break;
                }
            }

            if (!busy) {
                // Merge with previous gap if adjacent
                if (!res.empty() && res.back()[1] == start) {
                    res.back()[1] = end;
                } else {
                    res.push_back({start, end});
                }
            }
        }

        return res;
    }
};
