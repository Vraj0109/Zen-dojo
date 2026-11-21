#include <string>

using namespace std;

class Solution {
    int dfs(int i, int j, const string& s, const string& t) {
        if (j == (int)t.size()) {
            return 1;
        }
        if (i == (int)s.size()) {
            return 0;
        }

        int ways = dfs(i + 1, j, s, t); // skip s[i]
        if (s[i] == t[j]) {
            ways += dfs(i + 1, j + 1, s, t); // match s[i] with t[j]
        }
        return ways;
    }

public:
    int numDistinct(string s, string t) {
        return dfs(0, 0, s, t);
    }
};
