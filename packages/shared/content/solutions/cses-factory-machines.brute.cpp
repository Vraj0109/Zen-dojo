#include <vector>
#include <algorithm>

class Solution {
public:
    long long factoryMachines(std::vector<int>& machines, int t) {
        long long lo = 1;
        int min_val = machines[0];
        for (int m : machines) min_val = std::min(min_val, m);
        long long hi = (long long)min_val * t;
        long long ans = hi;
        while (lo <= hi) {
            long long mid = lo + (hi - lo) / 2;
            long long products = 0;
            for (int m : machines) {
                products += mid / m;
                if (products >= t) break;
            }
            if (products >= t) {
                ans = mid;
                hi = mid - 1;
            } else {
                lo = mid + 1;
            }
        }
        return ans;
    }
};
