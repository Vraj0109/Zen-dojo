#include <vector>
#include <numeric>

class Solution {
    struct DSU {
        std::vector<int> parent;
        int comps;
        DSU(int n) : parent(n + 1), comps(n) {
            std::iota(parent.begin(), parent.end(), 0);
        }
        int find(int i) {
            if (parent[i] == i) return i;
            return parent[i] = find(parent[i]);
        }
        void unite(int i, int j) {
            int rootI = find(i);
            int rootJ = find(j);
            if (rootI != rootJ) {
                parent[rootI] = rootJ;
                comps--;
            }
        }
    };
public:
    int buildingRoads(int n, std::vector<std::vector<int>>& roads) {
        DSU dsu(n);
        for (const auto& r : roads) {
            dsu.unite(r[0], r[1]);
        }
        return dsu.comps - 1;
    }
};
