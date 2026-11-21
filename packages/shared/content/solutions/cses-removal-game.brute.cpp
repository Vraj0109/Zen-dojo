#include <vector>
#include <algorithm>

class Solution {
public:
    long long removalGame(std::vector<int>& arr) {
        int n = arr.size();
        long long total = 0;
        for (int x : arr) total += x;
        std::vector<long long> dp(arr.begin(), arr.end());
        for (int len = 2; len <= n; len++) {
            for (int i = 0; i <= n - len; i++) {
                int j = i + len - 1;
                dp[i] = std::max((long long)arr[i] - dp[i + 1], (long long)arr[j] - dp[i]);
            }
        }
        return (total + dp[0]) / 2;
    }
};
