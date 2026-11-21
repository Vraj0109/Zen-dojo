#include <vector>

class Solution {
public:
    int messageRoute(int n, std::vector<std::vector<int>>& connections) {
        std::vector<std::vector<int>> adj(n + 1);
        for (const auto& c : connections) {
            adj[c[0]].push_back(c[1]);
            adj[c[1]].push_back(c[0]);
        }
        std::vector<int> dist(n + 1, -1);
        dist[1] = 0;
        std::vector<int> q;
        q.reserve(n);
        q.push_back(1);
        size_t head = 0;
        while (head < q.size()) {
            int u = q[head++];
            if (u == n) return dist[u] + 1;
            for (int v : adj[u]) {
                if (dist[v] == -1) {
                    dist[v] = dist[u] + 1;
                    q.push_back(v);
                }
            }
        }
        return -1;
    }
};
