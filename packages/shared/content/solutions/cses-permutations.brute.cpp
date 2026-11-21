#include <vector>

class Solution {
public:
    std::vector<int> permutations(int n) {
        if (n == 1) return {1};
        if (n == 2 || n == 3) return {};
        std::vector<int> out;
        out.reserve(n);
        for (int i = 2; i <= n; i += 2) out.push_back(i);
        for (int i = 1; i <= n; i += 2) out.push_back(i);
        return out;
    }
};
