#include <vector>

class Solution {
public:
    int canCompleteCircuit(std::vector<int>& gas, std::vector<int>& cost) {
        int n = gas.size();
        for (int start = 0; start < n; start++) {
            int tank = 0;
            bool ok = true;
            for (int step = 0; step < n; step++) {
                int i = (start + step) % n;
                tank += gas[i] - cost[i];
                if (tank < 0) {
                    ok = false;
                    break;
                }
            }
            if (ok) return start;
        }
        return -1;
    }
};
