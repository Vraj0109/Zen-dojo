#include <string>
#include <vector>

using namespace std;

class Solution {
public:
    vector<int> zFunction(string s) {
        int n = s.size();
        vector<int> z(n, 0);
        for (int i = 1; i < n; i++) {
            while (i + z[i] < n && s[z[i]] == s[i + z[i]]) {
                z[i]++;
            }
        }
        return z;
    }
};
