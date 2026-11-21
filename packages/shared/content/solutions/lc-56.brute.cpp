#include <vector>
#include <algorithm>

class Solution {
public:
    std::vector<std::vector<int>> merge(std::vector<std::vector<int>>& intervals) {
        std::vector<std::vector<int>> res = intervals;
        bool merged = true;
        while (merged) {
            merged = false;
            for (size_t i = 0; i < res.size(); i++) {
                for (size_t j = i + 1; j < res.size(); j++) {
                    // check if res[i] and res[j] overlap
                    if (std::max(res[i][0], res[j][0]) <= std::min(res[i][1], res[j][1])) {
                        res[i][0] = std::min(res[i][0], res[j][0]);
                        res[i][1] = std::max(res[i][1], res[j][1]);
                        res.erase(res.begin() + j);
                        merged = true;
                        break;
                    }
                }
                if (merged) break;
            }
        }
        std::sort(res.begin(), res.end());
        return res;
    }
};
