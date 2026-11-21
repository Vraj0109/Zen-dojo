#include <string>
#include <vector>

using namespace std;

class Solution {
public:
    vector<int> rabinKarp(string pattern, string text) {
        int m = pattern.size();
        int n = text.size();
        vector<int> res;
        if (m > n || m == 0) return res;
        for (int i = 0; i <= n - m; i++) {
            bool ok = true;
            for (int j = 0; j < m; j++) {
                if (text[i + j] != pattern[j]) {
                    ok = false;
                    break;
                }
            }
            if (ok) {
                res.push_back(i);
            }
        }
        return res;
    }
};
