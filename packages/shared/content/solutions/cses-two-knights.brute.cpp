#include <vector>

class Solution {
public:
    std::vector<long long> twoKnights(int n) {
        std::vector<long long> res;
        for (long long k = 1; k <= n; k++) {
            long long total = (k * k) * (k * k - 1) / 2;
            long long attack = 4 * (k - 1) * (k - 2);
            res.push_back(total - attack);
        }
        return res;
    }
};
