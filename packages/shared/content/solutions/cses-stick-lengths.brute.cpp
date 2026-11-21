#include <vector>
#include <algorithm>
#include <cmath>

class Solution {
public:
    long long stickLengths(std::vector<int>& lengths) {
        long long best = -1;
        for (int target : lengths) {
            long long cost = 0;
            for (int x : lengths) {
                cost += std::abs((long long)x - target);
            }
            if (best == -1 || cost < best) {
                best = cost;
            }
        }
        return best;
    }
};
