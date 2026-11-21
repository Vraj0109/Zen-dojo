#include <vector>
#include <queue>

class Solution {
public:
    std::vector<long long> shortestRoutesI(int n, std::vector<std::vector<int>>& flights) {
        std::vector<std::vector<std::pair<int, int>>> adj(n + 1);
        for (const auto& f : flights) {
            adj[f[0]].push_back({f[1], f[2]});
        }
        const long long INF = 4e18;
        std::vector<long long> dist(n + 1, INF);
        std::priority_queue<std::pair<long long, int>, std::vector<std::pair<long long, int>>, std::greater<std::pair<long long, int>>> pq;
        dist[1] = 0;
        pq.push({0, 1});
        while (!pq.empty()) {
            auto [d, u] = pq.top();
            pq.pop();
            if (d > dist[u]) continue;
            for (const auto& [v, w] : adj[u]) {
                if (dist[u] + w < dist[v]) {
                    dist[v] = dist[u] + w;
                    pq.push({dist[v], v});
                }
            }
        }
        std::vector<long long> ans(n);
        for (int i = 1; i <= n; i++) {
            ans[i - 1] = (dist[i] == INF ? -1 : dist[i]);
        }
        return ans;
    }
};
