#include <string>
#include <algorithm>

class Solution {
    int dfs(const std::string& s1, const std::string& s2, int i, int j) {
        if (i == 0) return j;
        if (j == 0) return i;
        if (s1[i - 1] == s2[j - 1]) return dfs(s1, s2, i - 1, j - 1);
        int replace_op = dfs(s1, s2, i - 1, j - 1);
        int delete_op = dfs(s1, s2, i - 1, j);
        int insert_op = dfs(s1, s2, i, j - 1);
        return 1 + std::min({replace_op, delete_op, insert_op});
    }
public:
    int minDistance(std::string word1, std::string word2) {
        return dfs(word1, word2, word1.size(), word2.size());
    }
};
