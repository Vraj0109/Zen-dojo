#include <vector>

class Solution {
public:
    bool carPooling(std::vector<std::vector<int>>& trips, int capacity) {
        std::vector<int> road(1001, 0);
        for (const auto& trip : trips) {
            int num = trip[0], from = trip[1], to = trip[2];
            for (int km = from; km < to; km++) {
                road[km] += num;
                if (road[km] > capacity) return false;
            }
        }
        return true;
    }
};
