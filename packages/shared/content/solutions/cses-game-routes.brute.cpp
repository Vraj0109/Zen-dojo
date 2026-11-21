#include <vector>

class Solution {
public:
    int gameRoutes(int n, std::vector<std::vector<int>>& teleporters) {
        const int MOD = 1000000007;
        std::vector<std::vector<int>> adj(n + 1);
        std::vector<int> indeg(n + 1, 0);
        for (const auto& t : teleporters) {
            adj[t[0]].push_back(t[1]);
            indeg[t[1]]++;
        }
        std::vector<int> q;
        q.reserve(n);
        for (int i = 1; i <= n; i++) {
            if (indeg[i] == 0) q.push_back(i);
        }
        std::vector<int> ways(n + 1, 0);
        ways[1] = 1;
        size_t head = 0;
        while (head < q.size()) {
            int u = q[head++];
            for (int v : adj[u]) {
                ways[v] = (ways[v] + ways[u]) % MOD;
                if (--indeg[v] == 0) q.push_back(v);
            }
        }
        return ways[n];
    }
};
