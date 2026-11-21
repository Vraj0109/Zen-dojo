#include <vector>
#include <algorithm>

class Solution {
    int maxKeep(const std::vector<std::vector<int>>& intervals, int i, int prev_end) {
        if (i == (int)intervals.size()) return 0;
        int res = maxKeep(intervals, i + 1, prev_end);
        if (intervals[i][0] >= prev_end) {
            res = std::max(res, 1 + maxKeep(intervals, i + 1, intervals[i][1]));
        }
        return res;
    }
public:
    int eraseOverlapIntervals(std::vector<std::vector<int>>& intervals) {
        std::sort(intervals.begin(), intervals.end());
        int kept = maxKeep(intervals, 0, -1e9);
        return intervals.size() - kept;
    }
};
