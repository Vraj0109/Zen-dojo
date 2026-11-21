#include <bits/stdc++.h>
using namespace std;

class Solution {
    int total_count = 0;
    string cur;
    const int MOD = 1000000007;

    void backtrack(int n, const string& pattern) {
        if ((int)cur.size() == n) {
            if (cur.find(pattern) != string::npos) {
                total_count = (total_count + 1) % MOD;
            }
            return;
        }
        for (char c = 'A'; c <= 'Z'; c++) {
            cur.push_back(c);
            backtrack(n, pattern);
            cur.pop_back();
        }
    }
public:
    int requiredSubstring(int n, string pattern) {
        int m = pattern.size();
        const int MOD = 1000000007;
        if (n <= 4) {
            total_count = 0;
            cur.clear();
            backtrack(n, pattern);
            return total_count;
        }
        // Fallback for tests with larger n (e.g. n=1000)
        vector<int> pi(m, 0);
        for (int i = 1; i < m; i++) {
            int j = pi[i - 1];
            while (j > 0 && pattern[i] != pattern[j]) j = pi[j - 1];
            if (pattern[i] == pattern[j]) j++;
            pi[i] = j;
        }

        vector<vector<int>> aut(m, vector<int>(26, 0));
        for (int state = 0; state < m; state++) {
            for (int c = 0; c < 26; c++) {
                char ch = 'A' + c;
                int j = state;
                while (j > 0 && ch != pattern[j]) j = pi[j - 1];
                if (ch == pattern[j]) j++;
                aut[state][c] = j;
            }
        }

        vector<int> dp(m, 0);
        dp[0] = 1;

        for (int step = 0; step < n; step++) {
            vector<int> next_dp(m, 0);
            for (int state = 0; state < m; state++) {
                if (!dp[state]) continue;
                for (int c = 0; c < 26; c++) {
                    int nxt = aut[state][c];
                    if (nxt < m) {
                        next_dp[nxt] = (next_dp[nxt] + dp[state]) % MOD;
                    }
                }
            }
            dp = move(next_dp);
        }

        long long total = 1;
        for (int i = 0; i < n; i++) total = (total * 26) % MOD;
        long long without = 0;
        for (int state = 0; state < m; state++) without = (without + dp[state]) % MOD;

        return (int)((total - without + MOD) % MOD);
    }
};
