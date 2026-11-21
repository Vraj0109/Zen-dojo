#include <vector>
#include <numeric>
#include <cmath>
#include <algorithm>

class Solution {
public:
    long long appleDivision(std::vector<long long>& weights) {
        int n = weights.size();
        long long total = 0;
        for (long long w : weights) total += w;
        long long best = total;
        for (int mask = 0; mask < (1 << n); mask++) {
            long long s = 0;
            for (int i = 0; i < n; i++) {
                if (mask & (1 << i)) s += weights[i];
            }
            best = std::min(best, std::abs(total - 2 * s));
        }
        return best;
    }
};
