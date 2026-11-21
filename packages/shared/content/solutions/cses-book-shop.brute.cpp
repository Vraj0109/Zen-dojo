#include <vector>
#include <algorithm>

class Solution {
public:
    int bookShop(std::vector<int>& prices, std::vector<int>& pages, int maxPrice) {
        std::vector<int> dp(maxPrice + 1, 0);
        int n = prices.size();
        for (int i = 0; i < n; i++) {
            int p = prices[i], pg = pages[i];
            for (int j = maxPrice; j >= p; j--) {
                dp[j] = std::max(dp[j], dp[j - p] + pg);
            }
        }
        return dp[maxPrice];
    }
};
