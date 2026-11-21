#include <vector>
#include <climits>
#include <numeric>

using namespace std;

class Solution {
    int memo[31][31];

    int solve(int i, int j, int k, const vector<int>& pre) {
        if (i == j) return 0;
        if (memo[i][j] != -1) return memo[i][j];

        int ans = 1e9;
        for (int m = i; m < j; m += k - 1) {
            ans = min(ans, solve(i, m, k, pre) + solve(m + 1, j, k, pre));
        }

        if ((j - i) % (k - 1) == 0) {
            ans += pre[j + 1] - pre[i];
        }
        return memo[i][j] = ans;
    }

public:
    int mergeStones(vector<int>& stones, int k) {
        int n = (int)stones.size();
        if ((n - 1) % (k - 1) != 0) return -1;

        vector<int> pre(n + 1, 0);
        for (int i = 0; i < n; ++i) pre[i + 1] = pre[i] + stones[i];

        for (int i = 0; i < n; ++i) {
            for (int j = 0; j < n; ++j) {
                memo[i][j] = -1;
            }
        }

        return solve(0, n - 1, k, pre);
    }
};
