#include <vector>
#include <climits>
#include <algorithm>

using namespace std;

class Solution {
    int min_cost;

    void dfs(int u, int dst, int k, int cost, const vector<vector<pair<int, int>>>& g, vector<bool>& visited) {
        if (u == dst) {
            min_cost = min(min_cost, cost);
            return;
        }
        if (k < 0 || cost >= min_cost) return;

        visited[u] = true;
        for (const auto& edge : g[u]) {
            int v = edge.first;
            int price = edge.second;
            if (!visited[v]) {
                dfs(v, dst, k - 1, cost + price, g, visited);
            }
        }
        visited[u] = false;
    }

public:
    int findCheapestPrice(int n, vector<vector<int>>& flights, int src, int dst, int k) {
        vector<vector<pair<int, int>>> g(n);
        for (const auto& f : flights) {
            g[f[0]].push_back({f[1], f[2]});
        }
        min_cost = INT_MAX;
        vector<bool> visited(n, false);
        dfs(src, dst, k, 0, g, visited);
        return min_cost == INT_MAX ? -1 : min_cost;
    }
};
