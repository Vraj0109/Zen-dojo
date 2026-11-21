#include <vector>
#include <algorithm>

class Solution {
public:
    int longestNonDecreasingRun(std::vector<int>& a) {
        int n = a.size();
        int max_len = 0;
        for (int i = 0; i < n; i++) {
            for (int j = i; j < n; j++) {
                bool ok = true;
                for (int k = i; k < j; k++) {
                    if (a[k] > a[k + 1]) {
                        ok = false;
                        break;
                    }
                }
                if (ok) {
                    max_len = std::max(max_len, j - i + 1);
                }
            }
        }
        return max_len;
    }
};
