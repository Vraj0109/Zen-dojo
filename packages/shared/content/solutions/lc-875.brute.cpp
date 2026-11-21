#include <vector>
#include <algorithm>

class Solution {
public:
    int minEatingSpeed(std::vector<int>& piles, int h) {
        int max_p = *std::max_element(piles.begin(), piles.end());
        for (int k = 1; k <= max_p; k++) {
            long long hours = 0;
            for (int p : piles) {
                hours += (p + k - 1) / k;
            }
            if (hours <= h) return k;
        }
        return max_p;
    }
};
