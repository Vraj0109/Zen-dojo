#include <vector>
#include <algorithm>
#include <set>

using namespace std;

class Solution {
    void backtrack(const vector<int>& c, int idx, int sum, int target, vector<int>& cur, set<vector<int>>& res) {
        if (sum == target) {
            res.insert(cur);
            return;
        }
        if (sum > target || idx == (int)c.size()) return;

        // Choice 1: include c[idx]
        cur.push_back(c[idx]);
        backtrack(c, idx + 1, sum + c[idx], target, cur, res);
        cur.pop_back();

        // Choice 2: exclude c[idx]
        backtrack(c, idx + 1, sum, target, cur, res);
    }

public:
    vector<vector<int>> combinationSum2(vector<int>& candidates, int target) {
        sort(candidates.begin(), candidates.end());
        set<vector<int>> res;
        vector<int> cur;
        backtrack(candidates, 0, 0, target, cur, res);
        return vector<vector<int>>(res.begin(), res.end());
    }
};
