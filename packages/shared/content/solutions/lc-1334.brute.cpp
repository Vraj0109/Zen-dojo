#include <vector>
#include <queue>
#include <climits>

using namespace std;

class Solution {
    int dijkstraCount(int src, int n, int threshold, const vector<vector<pair<int, int>>>& g) {
        vector<int> dist(n, INT_MAX);
        priority_queue<pair<int, int>, vector<pair<int, int>>, greater<>> pq;
        dist[src] = 0;
        pq.push({0, src});

        while (!pq.empty()) {
            auto [d, u] = pq.top();
            pq.pop();
            if (d > dist[u]) continue;

            for (const auto& edge : g[u]) {
                int v = edge.first;
                int w = edge.second;
                if (d + w < dist[v]) {
                    dist[v] = d + w;
                    pq.push({dist[v], v});
                }
            }
        }

        int count = 0;
        for (int i = 0; i < n; ++i) {
            if (i != src && dist[i] <= threshold) {
                count++;
            }
        }
        return count;
    }

public:
    int findTheCity(int n, vector<vector<int>>& edges, int distanceThreshold) {
        vector<vector<pair<int, int>>> g(n);
        for (const auto& e : edges) {
            g[e[0]].push_back({e[1], e[2]});
            g[e[1]].push_back({e[0], e[2]});
        }

        int bestCity = -1;
        int minReachable = INT_MAX;

        for (int i = 0; i < n; ++i) {
            int reachable = dijkstraCount(i, n, distanceThreshold, g);
            if (reachable <= minReachable) {
                minReachable = reachable;
                bestCity = i;
            }
        }

        return bestCity;
    }
};
