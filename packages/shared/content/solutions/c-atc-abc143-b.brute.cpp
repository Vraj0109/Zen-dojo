#include <vector>

class Solution {
public:
    int pairProductSum(std::vector<int>& d) {
        int n = d.size();
        int total = 0;
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                total += d[i] * d[j];
            }
        }
        return total;
    }
};
