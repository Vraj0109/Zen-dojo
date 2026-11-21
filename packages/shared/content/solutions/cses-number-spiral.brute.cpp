#include <algorithm>

class Solution {
public:
    long long numberSpiral(long long y, long long x) {
        long long z = std::max(y, x);
        long long z2 = (z - 1) * (z - 1);
        if (z % 2 == 0) {
            return (y == z) ? z * z - x + 1 : z2 + y;
        } else {
            return (x == z) ? z * z - y + 1 : z2 + x;
        }
    }
};
