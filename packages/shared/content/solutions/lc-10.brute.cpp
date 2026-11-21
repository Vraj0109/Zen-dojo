#include <string>

using namespace std;

class Solution {
    bool dfs(int i, int j, const string& s, const string& p) {
        if (j == (int)p.size()) {
            return i == (int)s.size();
        }

        bool first_match = (i < (int)s.size() && (p[j] == s[i] || p[j] == '.'));

        if (j + 1 < (int)p.size() && p[j + 1] == '*') {
            // Choice 1: skip zero occurrences
            // Choice 2: match 1 occurrence if first matches
            return dfs(i, j + 2, s, p) || (first_match && dfs(i + 1, j, s, p));
        } else {
            return first_match && dfs(i + 1, j + 1, s, p);
        }
    }

public:
    bool isMatch(string s, string p) {
        return dfs(0, 0, s, p);
    }
};
