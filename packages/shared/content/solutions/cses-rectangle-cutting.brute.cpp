#include <vector>
#include <algorithm>

class Solution {
public:
    int rectangleCutting(int a, int b) {
        std::vector<std::vector<int>> dp(a + 1, std::vector<int>(b + 1, 0));
        for (int w = 1; w <= a; w++) {
            for (int h = 1; h <= b; h++) {
                if (w == h) {
                    dp[w][h] = 0;
                    continue;
                }
                int best = 1e9;
                for (int k = 1; k < w; k++) {
                    best = std::min(best, dp[k][h] + dp[w - k][h] + 1);
                }
                for (int k = 1; k < h; k++) {
                    best = std::min(best, dp[w][k] + dp[w][h - k] + 1);
                }
                dp[w][h] = best;
            }
        }
        return dp[a][b];
    }
};
