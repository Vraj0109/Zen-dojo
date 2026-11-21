#include <vector>
#include <climits>
#include <algorithm>

using namespace std;

class Solution {
    int dfs(int day, int k, bool holding, const vector<int>& prices) {
        if (day == (int)prices.size() || (k == 0 && !holding)) {
            return 0;
        }

        // Choice 1: do nothing
        int res = dfs(day + 1, k, holding, prices);

        if (holding) {
            // Choice 2: sell
            res = max(res, prices[day] + dfs(day + 1, k, false, prices));
        } else if (k > 0) {
            // Choice 2: buy
            res = max(res, -prices[day] + dfs(day + 1, k - 1, true, prices));
        }
        return res;
    }

public:
    int maxProfit(int k, vector<int>& prices) {
        return dfs(0, k, false, prices);
    }
};
