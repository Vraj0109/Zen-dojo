#include <string>

using namespace std;

class Solution {
public:
    int stringMatching(string s, string pattern) {
        int n = s.size();
        int m = pattern.size();
        if (m == 0 || n < m) return 0;
        int count = 0;
        for (int i = 0; i <= n - m; i++) {
            bool ok = true;
            for (int j = 0; j < m; j++) {
                if (s[i + j] != pattern[j]) {
                    ok = false;
                    break;
                }
            }
            if (ok) count++;
        }
        return count;
    }
};
