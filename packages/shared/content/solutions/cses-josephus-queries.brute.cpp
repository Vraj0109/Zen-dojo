#include <vector>

using namespace std;

class Solution {
    int solve(int n, int k) {
        if (n == 1) return 1;
        if (k <= (n + 1) / 2) {
            if (2 * k > n) return 1;
            return 2 * k;
        }
        int temp = solve(n / 2, k - (n + 1) / 2);
        if (n % 2 == 1) {
            return 2 * temp + 1;
        } else {
            return 2 * temp - 1;
        }
    }
public:
    vector<int> josephusQueries(vector<vector<int>>& queries) {
        vector<int> ans;
        ans.reserve(queries.size());
        for (const auto& q : queries) {
            ans.push_back(solve(q[0], q[1]));
        }
        return ans;
    }
};
