#include <vector>
#include <algorithm>

class Solution {
public:
    int restaurantCustomers(std::vector<std::vector<int>>& customers) {
        int max_overlap = 0;
        for (const auto& c1 : customers) {
            int arrival = c1[0];
            int count = 0;
            for (const auto& c2 : customers) {
                if (c2[0] <= arrival && arrival <= c2[1]) {
                    count++;
                }
            }
            max_overlap = std::max(max_overlap, count);
        }
        return max_overlap;
    }
};
