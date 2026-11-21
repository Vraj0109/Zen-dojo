#include <vector>
#include <algorithm>

using namespace std;

class Solution {
    // state: 0 = can buy (rest), 1 = holding, 2 = just sold (cooldown)
    int dfs(const vector<int>& prices, int i, int state) {
        if (i >= (int)prices.size()) return 0;
        int ans = 0;
        if (state == 0) {
            // Choice 1: rest
            ans = max(ans, dfs(prices, i + 1, 0));
            // Choice 2: buy
            ans = max(ans, -prices[i] + dfs(prices, i + 1, 1));
        } else if (state == 1) {
            // Choice 1: hold
            ans = max(ans, dfs(prices, i + 1, 1));
            // Choice 2: sell -> goes to cooldown (state 2)
            ans = max(ans, prices[i] + dfs(prices, i + 1, 2));
        } else if (state == 2) {
            // In cooldown: must rest today -> state 0 tomorrow
            ans = dfs(prices, i + 1, 0);
        }
        return ans;
    }
public:
    int maxProfit(vector<int>& prices) {
        return dfs(prices, 0, 0);
    }
};
