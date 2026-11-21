#include <vector>
#include <algorithm>

class Solution {
public:
    long long missingCoinSum(std::vector<int>& coins) {
        std::sort(coins.begin(), coins.end());
        long long reach = 0;
        for (int c : coins) {
            if (c > reach + 1) break;
            reach += c;
        }
        return reach + 1;
    }
};
