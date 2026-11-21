#include <vector>

class Solution {
public:
    int longestFlightRoute(int n, std::vector<std::vector<int>>& flights) {
        std::vector<std::vector<int>> adj(n + 1);
        std::vector<int> indeg(n + 1, 0);
        for (const auto& f : flights) {
            adj[f[0]].push_back(f[1]);
            indeg[f[1]]++;
        }
        std::vector<int> q;
        q.reserve(n);
        for (int i = 1; i <= n; i++) {
            if (indeg[i] == 0) q.push_back(i);
        }
        std::vector<int> topo;
        topo.reserve(n);
        size_t head = 0;
        while (head < q.size()) {
            int u = q[head++];
            topo.push_back(u);
            for (int v : adj[u]) {
                if (--indeg[v] == 0) q.push_back(v);
            }
        }
        std::vector<int> dp(n + 1, -1);
        dp[1] = 1;
        for (int u : topo) {
            if (dp[u] == -1) continue;
            for (int v : adj[u]) {
                if (dp[u] + 1 > dp[v]) {
                    dp[v] = dp[u] + 1;
                }
            }
        }
        return dp[n];
    }
};
