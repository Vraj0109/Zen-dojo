#include <vector>
#include <algorithm>

class Solution {
public:
    int movieFestival(std::vector<std::vector<int>>& movies) {
        std::sort(movies.begin(), movies.end(), [](const std::vector<int>& a, const std::vector<int>& b) {
            return a[1] < b[1];
        });
        int count = 0, last_end = 0;
        for (const auto& m : movies) {
            if (m[0] >= last_end) {
                count++;
                last_end = m[1];
            }
        }
        return count;
    }
};
