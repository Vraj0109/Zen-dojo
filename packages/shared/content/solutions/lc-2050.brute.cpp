#include <vector>
#include <algorithm>

using namespace std;

class Solution {
    int dfs(int u, const vector<vector<int>>& g, const vector<int>& time, vector<int>& memo) {
        if (memo[u] != -1) return memo[u];
        int maxChild = 0;
        for (int v : g[u]) {
            maxChild = max(maxChild, dfs(v, g, time, memo));
        }
        return memo[u] = time[u - 1] + maxChild;
    }
public:
    int minimumTime(int n, vector<vector<int>>& relations, vector<int>& time) {
        vector<vector<int>> g(n + 1);
        for (const auto& r : relations) {
            g[r[0]].push_back(r[1]);
        }
        vector<int> memo(n + 1, -1);
        int ans = 0;
        for (int i = 1; i <= n; i++) {
            ans = max(ans, dfs(i, g, time, memo));
        }
        return ans;
    }
};
