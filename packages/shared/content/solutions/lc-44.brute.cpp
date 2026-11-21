#include <string>

using namespace std;

class Solution {
    bool dfs(int i, int j, const string& s, const string& p) {
        if (j == (int)p.size()) {
            return i == (int)s.size();
        }
        if (i == (int)s.size()) {
            for (int k = j; k < (int)p.size(); ++k) {
                if (p[k] != '*') return false;
            }
            return true;
        }

        if (p[j] == '*') {
            // Choice 1: * matches empty sequence (advance pattern)
            // Choice 2: * matches 1 character (advance string)
            return dfs(i, j + 1, s, p) || dfs(i + 1, j, s, p);
        } else if (p[j] == '?' || p[j] == s[i]) {
            return dfs(i + 1, j + 1, s, p);
        }
        return false;
    }

public:
    bool isMatch(string s, string p) {
        return dfs(0, 0, s, p);
    }
};
