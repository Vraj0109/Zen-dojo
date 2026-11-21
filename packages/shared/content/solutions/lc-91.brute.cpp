#include <string>

class Solution {
    int dfs(const std::string& s, int i) {
        if (i == (int)s.size()) return 1;
        if (s[i] == '0') return 0;
        int ways = dfs(s, i + 1);
        if (i + 1 < (int)s.size()) {
            int two = (s[i] - '0') * 10 + (s[i + 1] - '0');
            if (two >= 10 && two <= 26) {
                ways += dfs(s, i + 2);
            }
        }
        return ways;
    }
public:
    int numDecodings(std::string s) {
        if (s.empty()) return 0;
        return dfs(s, 0);
    }
};
