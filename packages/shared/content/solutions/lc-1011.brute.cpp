#include <vector>
#include <algorithm>
#include <numeric>

class Solution {
    bool canShip(const std::vector<int>& weights, int days, int cap) {
        int used = 1, load = 0;
        for (int w : weights) {
            if (load + w > cap) {
                used++;
                load = 0;
            }
            load += w;
        }
        return used <= days;
    }
public:
    int shipWithinDays(std::vector<int>& weights, int days) {
        int lo = *std::max_element(weights.begin(), weights.end());
        int hi = std::accumulate(weights.begin(), weights.end(), 0);
        for (int c = lo; c <= hi; c++) {
            if (canShip(weights, days, c)) return c;
        }
        return hi;
    }
};
