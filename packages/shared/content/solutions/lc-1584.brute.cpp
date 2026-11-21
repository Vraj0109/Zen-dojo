#include <vector>
#include <cmath>
#include <algorithm>
#include <numeric>

using namespace std;

struct Edge {
    int u, v, w;
    bool operator<(const Edge& other) const {
        return w < other.w;
    }
};

class Solution {
    struct DSU {
        vector<int> parent;
        DSU(int n) : parent(n) {
            iota(parent.begin(), parent.end(), 0);
        }
        int find(int i) {
            if (parent[i] == i)
                return i;
            return parent[i] = find(parent[i]);
        }
        bool unite(int i, int j) {
            int root_i = find(i);
            int root_j = find(j);
            if (root_i != root_j) {
                parent[root_i] = root_j;
                return true;
            }
            return false;
        }
    };

public:
    int minCostConnectPoints(vector<vector<int>>& points) {
        int n = (int)points.size();
        vector<Edge> edges;
        for (int i = 0; i < n; ++i) {
            for (int j = i + 1; j < n; ++j) {
                int dist = abs(points[i][0] - points[j][0]) + abs(points[i][1] - points[j][1]);
                edges.push_back({i, j, dist});
            }
        }

        sort(edges.begin(), edges.end());

        DSU dsu(n);
        int total_cost = 0;
        int edges_count = 0;

        for (const auto& edge : edges) {
            if (dsu.unite(edge.u, edge.v)) {
                total_cost += edge.w;
                edges_count++;
                if (edges_count == n - 1) break;
            }
        }

        return total_cost;
    }
};
