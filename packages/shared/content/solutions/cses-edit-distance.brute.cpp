#include <string>
#include <vector>
#include <algorithm>

class Solution {
public:
    int editDistance(std::string s1, std::string s2) {
        int n = s1.size(), m = s2.size();
        std::vector<int> prev(m + 1), curr(m + 1);
        for (int j = 0; j <= m; j++) prev[j] = j;
        for (int i = 1; i <= n; i++) {
            curr[0] = i;
            for (int j = 1; j <= m; j++) {
                if (s1[i - 1] == s2[j - 1]) {
                    curr[j] = prev[j - 1];
                } else {
                    curr[j] = 1 + std::min({prev[j], curr[j - 1], prev[j - 1]});
                }
            }
            prev = curr;
        }
        return prev[m];
    }
};
