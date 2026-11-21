#include <string>
#include <algorithm>

class Solution {
    int dfs(const std::string& s1, const std::string& s2, int i, int j) {
        if (i == (int)s1.size() || j == (int)s2.size()) return 0;
        if (s1[i] == s2[j]) return 1 + dfs(s1, s2, i + 1, j + 1);
        return std::max(dfs(s1, s2, i + 1, j), dfs(s1, s2, i, j + 1));
    }
public:
    int longestCommonSubsequence(std::string text1, std::string text2) {
        return dfs(text1, text2, 0, 0);
    }
};
