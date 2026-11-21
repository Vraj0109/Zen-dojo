#include <vector>
#include <string>
#include <algorithm>

using namespace std;

class Solution {
    int dfs(const vector<pair<int, int>>& items, int idx, int m, int n) {
        if (idx == (int)items.size()) return 0;
        // Option 1: don't take
        int res = dfs(items, idx + 1, m, n);
        // Option 2: take if within capacity
        if (m >= items[idx].first && n >= items[idx].second) {
            res = max(res, 1 + dfs(items, idx + 1, m - items[idx].first, n - items[idx].second));
        }
        return res;
    }
public:
    int findMaxForm(vector<string>& strs, int m, int n) {
        vector<pair<int, int>> items;
        for (const auto& s : strs) {
            int z = count(s.begin(), s.end(), '0');
            int o = (int)s.size() - z;
            items.push_back({z, o});
        }
        return dfs(items, 0, m, n);
    }
};
