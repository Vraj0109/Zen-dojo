#include <string>
#include <algorithm>

class Solution {
public:
    int repetitions(std::string s) {
        int n = s.size();
        int best = 0;
        for (int i = 0; i < n; i++) {
            for (int j = i; j < n; j++) {
                bool all_same = true;
                for (int k = i; k <= j; k++) {
                    if (s[k] != s[i]) {
                        all_same = false;
                        break;
                    }
                }
                if (all_same) {
                    best = std::max(best, j - i + 1);
                }
            }
        }
        return best;
    }
};
