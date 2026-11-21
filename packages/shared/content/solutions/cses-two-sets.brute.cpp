#include <vector>
#include <algorithm>

class Solution {
public:
    std::vector<std::vector<int>> twoSets(int n) {
        long long total = (long long)n * (n + 1) / 2;
        if (total % 2 != 0) return {};
        long long target = total / 2;
        std::vector<int> s1, s2;
        for (int i = n; i >= 1; i--) {
            if (target >= i) {
                s1.push_back(i);
                target -= i;
            } else {
                s2.push_back(i);
            }
        }
        std::reverse(s1.begin(), s1.end());
        std::reverse(s2.begin(), s2.end());
        return {s1, s2};
    }
};
