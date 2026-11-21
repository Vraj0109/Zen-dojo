#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int wordCombinations(string s, vector<string>& words) {
        int n = s.size();
        const int MOD = 1000000007;
        vector<long long> dp(n + 1, 0);
        dp[0] = 1;

        for (int i = 0; i < n; i++) {
            if (dp[i] == 0) continue;
            for (const string& w : words) {
                int len = w.size();
                if (i + len <= n && s.compare(i, len, w) == 0) {
                    dp[i + len] = (dp[i + len] + dp[i]) % MOD;
                }
            }
        }
        return dp[n];
    }
};
