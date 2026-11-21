#include <vector>

class Solution {
public:
    int shiftOnly(std::vector<int>& a) {
        int ops = 0;
        while (true) {
            for (int x : a) {
                if (x % 2 != 0) return ops;
            }
            for (int& x : a) {
                x /= 2;
            }
            ops++;
        }
    }
};
