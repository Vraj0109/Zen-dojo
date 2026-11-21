#include <vector>
#include <algorithm>

using namespace std;

class Solution {
public:
    int maxEnvelopes(vector<vector<int>>& envelopes) {
        int n = envelopes.size();
        if (n == 0) return 0;
        vector<vector<int>> env = envelopes;
        sort(env.begin(), env.end(), [](const auto& a, const auto& b) {
            return a[0] != b[0] ? a[0] < b[0] : a[1] < b[1];
        });
        vector<int> dp(n, 1);
        int maxLen = 1;
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < i; j++) {
                if (env[j][0] < env[i][0] && env[j][1] < env[i][1]) {
                    dp[i] = max(dp[i], dp[j] + 1);
                }
            }
            maxLen = max(maxLen, dp[i]);
        }
        return maxLen;
    }
};
