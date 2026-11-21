#include <vector>
#include <queue>
#include <tuple>

class Solution {
public:
    long long flightDiscount(int n, std::vector<std::vector<int>>& flights) {
        std::vector<std::vector<std::pair<int, int>>> adj(n + 1);
        for (const auto& f : flights) {
            adj[f[0]].push_back({f[1], f[2]});
        }
        const long long INF = 4e18;
        std::vector<std::vector<long long>> dist(n + 1, std::vector<long long>(2, INF));
        using State = std::tuple<long long, int, int>;
        std::priority_queue<State, std::vector<State>, std::greater<State>> pq;
        dist[1][0] = 0;
        pq.push({0, 1, 0});
        while (!pq.empty()) {
            auto [d, u, used] = pq.top();
            pq.pop();
            if (d > dist[u][used]) continue;
            for (const auto& [v, c] : adj[u]) {
                if (used == 0) {
                    if (dist[u][0] + c < dist[v][0]) {
                        dist[v][0] = dist[u][0] + c;
                        pq.push({dist[v][0], v, 0});
                    }
                    long long discounted = c / 2;
                    if (dist[u][0] + discounted < dist[v][1]) {
                        dist[v][1] = dist[u][0] + discounted;
                        pq.push({dist[v][1], v, 1});
                    }
                } else {
                    if (dist[u][1] + c < dist[v][1]) {
                        dist[v][1] = dist[u][1] + c;
                        pq.push({dist[v][1], v, 1});
                    }
                }
            }
        }
        return dist[n][1];
    }
};
