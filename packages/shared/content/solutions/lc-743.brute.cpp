#include <vector>
#include <climits>
#include <algorithm>

using namespace std;

class Solution {
    void dfs(int u, int current_dist, vector<int>& dist, const vector<vector<pair<int, int>>>& g) {
        if (current_dist >= dist[u]) return;
        dist[u] = current_dist;
        for (const auto& edge : g[u]) {
            int v = edge.first;
            int w = edge.second;
            dfs(v, current_dist + w, dist, g);
        }
    }

public:
    int networkDelayTime(vector<vector<int>>& times, int n, int k) {
        vector<vector<pair<int, int>>> g(n + 1);
        for (const auto& t : times) {
            g[t[0]].push_back({t[1], t[2]});
        }
        vector<int> dist(n + 1, INT_MAX);
        dfs(k, 0, dist, g);
        int ans = 0;
        for (int i = 1; i <= n; ++i) {
            if (dist[i] == INT_MAX) return -1;
            ans = max(ans, dist[i]);
        }
        return ans;
    }
};
