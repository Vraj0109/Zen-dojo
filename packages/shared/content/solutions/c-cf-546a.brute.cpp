#include <algorithm>

class Solution {
public:
    long long borrowMoney(int k, int n, int w) {
        long long total = 0;
        for (int i = 1; i <= w; i++) {
            total += (long long)i * k;
        }
        return std::max(0LL, total - n);
    }
};
