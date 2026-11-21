#include <vector>
#include <algorithm>

using namespace std;

class Solution {
public:
    vector<long long> missingCoinSumQueries(vector<int>& coins, vector<vector<int>>& queries) {
        vector<long long> ans;
        ans.reserve(queries.size());
        for (const auto& q : queries) {
            int a = q[0] - 1;
            int b = q[1] - 1;
            vector<long long> sub(coins.begin() + a, coins.begin() + b + 1);
            sort(sub.begin(), sub.end());
            long long s = 0;
            for (long long c : sub) {
                if (c > s + 1) break;
                s += c;
            }
            ans.push_back(s + 1);
        }
        return ans;
    }
};
