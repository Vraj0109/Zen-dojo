#include <vector>

class Solution {
public:
    int arrayDescription(std::vector<int>& arr, int m) {
        const int MOD = 1e9 + 7;
        int n = arr.size();
        std::vector<int> dp(m + 2, 0);
        if (arr[0] == 0) {
            for (int v = 1; v <= m; v++) dp[v] = 1;
        } else {
            dp[arr[0]] = 1;
        }
        for (int i = 1; i < n; i++) {
            std::vector<int> next_dp(m + 2, 0);
            int lo = (arr[i] == 0) ? 1 : arr[i];
            int hi = (arr[i] == 0) ? m : arr[i];
            for (int v = lo; v <= hi; v++) {
                long long ways = (long long)dp[v - 1] + dp[v] + dp[v + 1];
                next_dp[v] = ways % MOD;
            }
            dp = std::move(next_dp);
        }
        int ans = 0;
        for (int v = 1; v <= m; v++) {
            ans = (ans + dp[v]) % MOD;
        }
        return ans;
    }
};
