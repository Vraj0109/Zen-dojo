#include <vector>
#include <numeric>

class Solution {
public:
    int missingNumber(int n, std::vector<int>& nums) {
        std::vector<bool> seen(n + 1, false);
        for (int x : nums) {
            seen[x] = true;
        }
        for (int i = 1; i <= n; i++) {
            if (!seen[i]) return i;
        }
        return -1;
    }
};
