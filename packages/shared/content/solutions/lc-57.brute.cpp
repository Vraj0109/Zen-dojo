#include <vector>
#include <algorithm>

class Solution {
public:
    std::vector<std::vector<int>> insert(std::vector<std::vector<int>>& intervals, std::vector<int>& newInterval) {
        std::vector<std::vector<int>> all = intervals;
        all.push_back(newInterval);
        std::sort(all.begin(), all.end());
        std::vector<std::vector<int>> merged;
        for (const auto& iv : all) {
            if (merged.empty() || merged.back()[1] < iv[0]) {
                merged.push_back(iv);
            } else {
                merged.back()[1] = std::max(merged.back()[1], iv[1]);
            }
        }
        return merged;
    }
};
