#include <vector>
#include <unordered_set>
#include <algorithm>

class Solution {
public:
    int totalFruit(std::vector<int>& fruits) {
        int n = fruits.size();
        int best = 0;
        for (int i = 0; i < n; i++) {
            std::unordered_set<int> types;
            for (int j = i; j < n; j++) {
                types.insert(fruits[j]);
                if (types.size() > 2) break;
                best = std::max(best, j - i + 1);
            }
        }
        return best;
    }
};
